// Después de convertir los STL, servir la web localmente y ejecutar:
// node scripts/prepare-mic-fronts.cjs URL_LOCAL assets/mic/v1
// Usa playwright-core y Chromium (ruta del ejecutable en KORA_CHROME).
const { chromium } = require('playwright-core');
const fs = require('node:fs/promises');
const path = require('node:path');

async function generar() {
  const [url, destino] = process.argv.slice(2);
  if (!url || !destino) throw Error('Indica la URL local del configurador y su carpeta de assets.');
  const mapas = path.join(destino,'frentes');
  await fs.mkdir(mapas,{recursive:true});
  const browser = await chromium.launch({
    executablePath:process.env.KORA_CHROME,
    headless:true, args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']
  });
  try {
    const page = await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1});
    await page.goto(url);
    await page.locator('#start').click();
    await page.addStyleTag({content:'.workspace{grid-template-columns:800px minmax(0,1fr);gap:16px}.preview-stage{width:800px!important;height:800px!important;border:0!important;}'});
    async function elegir(campo,valor) {
      await page.locator('#'+campo+' label').filter({has:page.locator('input[value="'+valor+'"]')}).click();
    }
    for (const modelo of ['DJI Mic','Otro modelo']) {
      await page.locator('#model').selectOption(modelo);
      const formas = modelo==='Otro modelo' ? ['rectangular'] :
        await page.locator('#shapes input:enabled').evaluateAll(inputs => inputs.map(i => i.value));
      for (const forma of formas) {
        if (forma!=='rectangular') await elegir('shapes',forma);
        const cabezas = await page.locator('#heads input:enabled').evaluateAll(inputs => inputs.map(i => i.value));
        for (const cabeza of cabezas) {
          await elegir('heads',cabeza);
          await page.waitForFunction(() => listo3D);
          const { foto, mapa } = await page.evaluate(() => {
            visor.centrar();
            const tam = lienzo.width;
            const atlas = document.createElement('canvas');
            atlas.width=tam*2; atlas.height=tam;
            const ctx=atlas.getContext('2d',{willReadFrequently:true});
            // Primera mitad: fondo, sombras y reflejos. Segunda: luz recibida por grupo RGB.
            const negro=[0,0,0], intensidad=.5;
            visor.pintar({cabeza:negro,placa:negro,cuerpo:negro});
            ctx.drawImage(lienzo,0,0);
            visor.pintar({cabeza:[intensidad,0,0],placa:[0,intensidad,0],cuerpo:[0,0,intensidad]});
            ctx.drawImage(lienzo,tam,0);
            const base=ctx.getImageData(0,0,tam,tam).data;
            const pesos=ctx.getImageData(tam,0,tam,tam);
            for (let i=0; i<base.length; i+=4) {
              for (let c=0;c<3;c++)
                pesos.data[i+c]=(pesos.data[i+c]-base[i+c])/(intensidad*ESCALA_LUZ_FRONTAL);
            }
            ctx.putImageData(pesos,tam,0);
            visor.pintar(tintesDe(seleccion()));
            return { foto:lienzo.toDataURL('image/png').split(',')[1], mapa:atlas.toDataURL('image/png').split(',')[1] };
          });
          const nombre=forma+'-'+cabeza+'.png';
          await fs.writeFile(path.join(destino,nombre),Buffer.from(foto,'base64'));
          await fs.writeFile(path.join(mapas,nombre),Buffer.from(mapa,'base64'));
          console.log(nombre);
        }
      }
    }
  } finally { await browser.close(); }
}
generar().catch(error => {console.error(error.message);process.exitCode=1;});
