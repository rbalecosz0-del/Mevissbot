const TelegramBot = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');

const token = process.env.BOT_TOKEN;
const mongoUri = process.env.MONGO_URI;
const channel = process.env.CHANNEL;

const bot = new TelegramBot(token, { polling: true });
const client = new MongoClient(mongoUri);

let db;

(async () => {
    await client.connect();
    db = client.db('telegramBot');
})();

// cek join
async function isJoined(userId) {
    try {
        const res = await bot.getChatMember(channel, userId);
        return ['member','administrator','creator'].includes(res.status);
    } catch {
        return false;
    }
}

// start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    if (!(await isJoined(userId))) {
        return bot.sendMessage(chatId,
`🚫 Join channel dulu!

👉 ${channel}`,
{
    reply_markup: {
        inline_keyboard: [
            [{ text: "Join Channel", url: `https://t.me/${channel.replace('@','')}` }]
        ]
    }
});
    }

    bot.sendMessage(chatId, "📤 Kirim file untuk mendapatkan link 🔗");
});

// simpan file
bot.on('document', async (msg) => {
    const fileId = msg.document.file_id;
    const code = Math.random().toString(36).substring(2,8);

    await db.collection('files').insertOne({ code, fileId });

    bot.sendMessage(msg.chat.id,
`✅ Link kamu:

https://t.me/${(await bot.getMe()).username}?start=${code}`);
});

// ambil file dari link
bot.onText(/\/start (.+)/, async (msg, match) => {
    const code = match[1];

    const data = await db.collection('files').findOne({ code });

    if (!data) return bot.sendMessage(msg.chat.id, "❌ File tidak ditemukan");

    bot.sendDocument(msg.chat.id, data.fileId);
});
