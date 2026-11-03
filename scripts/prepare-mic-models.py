"""Prepara las piezas de exhibición de Kora. Unidades de entrada: milímetros.

Uso: python scripts/prepare-mic-models.py CARPETA_STL assets/mic/v1
Dependencias de producción de assets: numpy, scipy, scikit-image, trimesh, fast-simplification, embreex.
El sitio sirve archivos estáticos; este paso se hace fuera del navegador.
"""
import argparse
import json
import struct
from pathlib import Path

import numpy as np
import trimesh
from scipy.ndimage import gaussian_filter
from skimage.measure import marching_cubes
from trimesh.ray.ray_pyembree import RayMeshIntersector


# Ejes derecha y arriba en el STL original. El frente queda hacia +Z de glTF.
PARTS = {
    'mango': ('Base Microfone', (1, 0, 0), (0, 0, -1), 1500),
    'cuadrada': ('cuerpo_pequeno', (-1, 0, 0), (0, 1, 0), 10000),
    'rectangular': ('cuerpo_grande', (0, 1, 0), (1, 0, 0), 2000),
    'corazon': ('placa_corazon', (1, -1, 0), (-1, -1, 0), 24000),
    'estrella': ('estrella', (1, 0, 0), (0, -1, 0), 18000),
    'espuma-pequeno': ('cabeza_espuma_pequeno', (1, 0, 0), (0, 0, 1), 14000),
    'espuma-grande': ('cabeza_espuma_grande', (1, 0, 0), (0, 0, 1), 15000),
    'malla-pequeno': ('cabeza_malla_pequeno', (1, 0, 0), (0, 0, 1), 82000),
    'malla-grande': ('cabeza_malla_grande', (1, 0, 0), (0, 0, 1), 82000),
}


def unit(v):
    return np.asarray(v) / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-12)


def bake_visibility(mesh, points, normals):
    """Mide la luz ambiente que llega a cada vértice, incluidos los huecos de la rejilla."""
    tracer = RayMeshIntersector(mesh)
    up = np.zeros_like(normals)
    up[:, 1] = 1
    up[np.abs(normals[:, 1]) > .85] = [1, 0, 0]
    tangent = unit(np.cross(normals, up))
    bitangent = np.cross(normals, tangent)
    origins = points + normals * .055
    hits = np.zeros(len(points))
    samples = 32
    for i in range(samples):
        radius = np.sqrt((i + .5) / samples)
        phi = i * 2.39996323
        direction = (tangent * (radius * np.cos(phi)) + bitangent * (radius * np.sin(phi))
                     + normals * np.sqrt(1 - radius * radius))
        hits += tracer.intersects_any(origins, direction)
    return (255 * (1 - hits / samples)).round().astype('u1')


def foam_exterior(mesh, pitch=.22):
    """La espuma grande tiene cáscaras superpuestas. Recupera las dos caras exteriores del STL."""
    low, high = mesh.bounds
    axes = [np.arange(start - 3*pitch, end + 4*pitch, pitch) for start, end in zip(low, high)]
    x, y = np.meshgrid(axes[0], axes[1], indexing='ij')
    tracer = RayMeshIntersector(mesh)
    surfaces = []
    for base, step in [(axes[2][0]-1, 1), (axes[2][-1]+1, -1)]:
        origins = np.column_stack((x.ravel(), y.ravel(), np.full(x.size, base)))
        directions = np.tile([0., 0., step], (len(origins), 1))
        hit, rays, _ = tracer.intersects_location(origins, directions, multiple_hits=False)
        z = np.full(x.size, np.nan)
        z[rays] = hit[:, 2]
        surfaces.append(z.reshape(x.shape)[:, :, None])
    solid = ((axes[2] >= surfaces[0]) & (axes[2] <= surfaces[1])).astype('f4')
    vertices, faces, _, _ = marching_cubes(gaussian_filter(solid, 1.1), level=.5)
    surface = trimesh.Trimesh(vertices*pitch + [axis[0] for axis in axes], faces, process=False)
    if surface.volume < 0:
        surface.invert()
    surface.vertices = (surface.vertices - surface.bounds[0]) * (mesh.extents / surface.extents) + low
    return surface


def export_piece(source, dest, right, up, face_budget):
    mesh = trimesh.load_mesh(source)
    if dest.stem == 'espuma-grande':
        mesh = foam_exterior(mesh)
    right, up = unit(right), unit(up)
    mesh.vertices = mesh.vertices @ np.column_stack((right, up, np.cross(right, up)))
    # El centro del eje de montaje cae sobre (0, y, 0). El extremo inferior está en y=0.
    center = mesh.bounds.mean(axis=0)
    center[1] = mesh.bounds[0, 1]
    mesh.apply_translation(-center)
    if len(mesh.faces) > face_budget:
        mesh = mesh.simplify_quadric_decimation(face_count=face_budget, aggression=5)
    mesh.update_faces(mesh.nondegenerate_faces())
    mesh.remove_unreferenced_vertices()
    # En la rejilla se comparten vértices entre alambres para no triplicar la descarga.
    smooth = mesh if dest.stem.startswith('malla-') else trimesh.graph.smooth_shade(
        mesh, angle=np.deg2rad(44), facet_minarea=None)
    points = np.asarray(smooth.vertices)
    normals = unit(smooth.vertex_normals)
    # Dos caras opuestas pueden cancelar la normal media en una unión del entramado.
    undefined = np.linalg.norm(normals, axis=1) < .999
    if undefined.any():
        incident = np.zeros(len(points), dtype=np.intp)
        incident[smooth.faces.ravel()] = np.repeat(np.arange(len(smooth.faces)), 3)
        normals[undefined] = unit(smooth.face_normals[incident[undefined]])
    visibility = bake_visibility(mesh, points, normals)
    triangles = smooth.faces.copy()
    if dest.stem in ('corazon', 'estrella'):
        # La cara de marca es plana. Separa sus normales de las de la pared biselada.
        front = (smooth.face_normals[:, 2] > .992) & (smooth.triangles_center[:, 2] > points[:, 2].max() - .10)
        ids, split = np.unique(triangles[front], return_inverse=True)
        triangles[front] = len(points) + split.reshape(-1, 3)
        points = np.vstack((points, points[ids]))
        normals = np.vstack((normals, np.tile([0., 0., 1.], (len(ids), 1))))
        visibility = np.concatenate((visibility, np.full(len(ids), 255, dtype='u1')))
    colors = np.column_stack([visibility, visibility, visibility, np.full_like(visibility, 255)])
    positions = (points * .001).astype('<f4')
    positions[:, 1] -= positions[:, 1].min()
    indices = np.asarray(triangles, dtype='<u2' if len(points) <= 65535 else '<u4').reshape(-1)

    binary = bytearray()
    views, accessors = [], []

    def attribute(array, kind, component, *, element=False, normalized=False):
        binary.extend(b'\0' * (-len(binary) % 4))
        views.append(dict(buffer=0, byteOffset=len(binary), byteLength=array.nbytes,
                          target=34963 if element else 34962))
        binary.extend(array.tobytes())
        entry = dict(bufferView=len(views) - 1, componentType=component, count=len(array), type=kind)
        if normalized:
            entry['normalized'] = True
        if array is positions:
            entry.update(min=array.min(0).tolist(), max=array.max(0).tolist())
        accessors.append(entry)
        return len(accessors) - 1

    attrs = {'POSITION': attribute(positions, 'VEC3', 5126),
             'NORMAL': attribute(normals.astype('<f4'), 'VEC3', 5126),
             'COLOR_0': attribute(colors, 'VEC4', 5121, normalized=True)}
    ix = attribute(indices, 'SCALAR', 5123 if indices.itemsize == 2 else 5125, element=True)
    doc = dict(asset=dict(version='2.0', generator='Kora'), scene=0, scenes=[dict(nodes=[0])],
               nodes=[dict(mesh=0)], meshes=[dict(name=dest.stem, primitives=[dict(attributes=attrs, indices=ix)])],
               buffers=[dict(byteLength=len(binary))], bufferViews=views, accessors=accessors)
    header = json.dumps(doc, separators=(',', ':')).encode('utf8')
    header += b' ' * (-len(header) % 4)
    binary.extend(b'\0' * (-len(binary) % 4))
    chunks = (struct.pack('<I4s', len(header), b'JSON') + header
              + struct.pack('<I4s', len(binary), b'BIN\0') + binary)
    dest.write_bytes(struct.pack('<4sII', b'glTF', 2, len(chunks) + 12) + chunks)
    print(f'{dest.name}: {len(indices)//3:,} triángulos, {dest.stat().st_size//1024} KiB',
          flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--piece', choices=PARTS)
    args = parser.parse_args()
    args.output.mkdir(exist_ok=True, parents=True)
    for key in ([args.piece] if args.piece else PARTS):
        stl, right, up, budget = PARTS[key]
        export_piece(args.source / (stl + '.stl'), args.output / (key + '.glb'), right, up, budget)
