
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // check if we have series
    const existing = await prisma.series.count();
    if (existing > 0) {
        console.log('✅ Database already seeded.');
        // Optional: clear db? For now, we append or skip.
        return;
    }

    const GENRES = ['Romance', 'Revenge', 'CEO', 'Thriller', 'Historical', 'Urban'];

    // Create 6 Series
    for (let i = 0; i < 6; i++) {
        const title = faker.music.songName() + ' ' + faker.person.jobTitle();
        const series = await prisma.series.create({
            data: {
                title: title,
                description: faker.lorem.paragraph(),
                language: 'en',
                genres: [faker.helpers.arrayElement(GENRES), faker.helpers.arrayElement(GENRES)],
                freeEpisodes: 3,
                episodeDurationSec: 180,
                defaultCoinCost: 5,
                // status property removed as it's not in Series schema
            }
        });

        console.log(`Created Series: ${series.title}`);

        // Create 10 Episodes for each series
        for (let ep = 1; ep <= 10; ep++) {
            // Alternating lock type
            let lockType = 'FREE';
            let coinCost = 0;

            if (ep > 3) {
                lockType = 'COINS'; // Or 'AD'
                coinCost = 5;
            }

            await prisma.episode.create({
                data: {
                    seriesId: series.id,
                    episodeNumber: ep,
                    status: 'PUBLISHED',
                    lockType: lockType as any,
                    coinCost: coinCost,
                    durationSec: 180 + Math.floor(Math.random() * 60),
                    // Use a placeholder public image/video for demo
                    // In real MVP, user uploads via Admin. 
                    // We'll point to a static asset served by our server or a public placeholder.
                    thumbnailKey: `public/img/placeholder_poster.jpg`,
                    videoKey: `public/video/placeholder.mp4`,
                    rawKey: `raw/placeholder.mp4`
                }
            });
        }
    }

    console.log('✅ Seeding complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
