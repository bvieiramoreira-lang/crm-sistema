const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

const uploadDir = path.join(__dirname, '../uploads');

async function run() {
    console.log('Iniciando otimização de imagens existentes em:', uploadDir);
    try {
        const files = await fs.readdir(uploadDir);
        let count = 0;
        let thumbCount = 0;

        for (const file of files) {
            // Ignorar miniaturas já geradas
            if (file.startsWith('thumb-')) continue;

            const filePath = path.join(uploadDir, file);
            const ext = path.extname(file).toLowerCase();

            if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
                console.log(`Processando: ${file}`);
                const tempPath = filePath + '.tmp';
                const thumbPath = path.join(uploadDir, 'thumb-' + file);

                try {
                    // 1. Otimizar original
                    const img = sharp(filePath);
                    const metadata = await img.metadata();

                    let pipeline = sharp(filePath);
                    if (metadata.width > 1200 || metadata.height > 1200) {
                        pipeline = pipeline.resize(1200, 1200, {
                            fit: 'inside',
                            withoutEnlargement: true
                        });
                    }

                    if (metadata.format === 'png') {
                        await pipeline.png({ quality: 70, compressionLevel: 8 }).toFile(tempPath);
                    } else {
                        await pipeline.jpeg({ quality: 70, progressive: true }).toFile(tempPath);
                    }

                    await fs.unlink(filePath);
                    await fs.rename(tempPath, filePath);
                    count++;

                    // 2. Gerar miniatura
                    await sharp(filePath)
                        .resize(150, 150, { fit: 'cover' })
                        .jpeg({ quality: 60, progressive: true })
                        .toFile(thumbPath);
                    thumbCount++;

                    console.log(`Sucesso: ${file}`);
                } catch (err) {
                    console.error(`Erro ao processar ${file}:`, err.message);
                    try {
                        await fs.unlink(tempPath);
                    } catch (_) {}
                }
            }
        }

        console.log(`Otimização concluída. ${count} originais otimizados, ${thumbCount} miniaturas geradas.`);
    } catch (error) {
        console.error('Erro ao ler diretório de uploads:', error);
    }
}

run();
