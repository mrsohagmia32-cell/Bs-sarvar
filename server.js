const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// আপনার দেওয়া গুগল শিটের সরাসরি CSV Export লিঙ্ক (Apps Script ছাড়া কাজ করবে)
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/17M3ymzVUHi7JHvDzni7Ihl0qugM4Bldx3hDgwtzgIPc/export?format=csv';

// মেমোরিতে ডাটা ক্যাশ রাখার ভেরিয়েবল
let cachedPosts = [];

// CSV ফরম্যাট থেকে টেক্সট ভেঙে JSON অবজেক্টে রূপান্তর করার ফাংশন
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    // প্রথম লাইনটিকে কলাম নাম (Header) হিসেবে ধরা
    const headers = lines[0].split(',').map(header => header.trim().replace(/^"|"$/g, ''));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const currentline = lines[i].split(',').map(val => val.trim().replace(/^"|"$/g, ''));
        const obj = {};

        headers.forEach((header, index) => {
            obj[header] = currentline[index] || '';
        });

        result.push(obj);
    }
    return result;
}

// ব্যাকগ্রাউন্ডে গুগল শিট থেকে ডাটা ফেচ (Fetch) করার মূল ফাংশন
function fetchSheetData() {
    const getCSV = (url) => {
        https.get(url, (res) => {
            // গুগল শিট ৩০১ বা ৩০২ রিডাইরেক্ট করলে নতুন লিঙ্ক হ্যান্ডেল করা
            if (res.statusCode === 301 || res.statusCode === 302) {
                return getCSV(res.headers.location);
            }

            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    cachedPosts = parseCSV(data);
                    console.log(`[${new Date().toLocaleTimeString()}] গুগল শিট থেকে ${cachedPosts.length}টি ডাটা সফলভাবে মেমোরিতে ক্যাশ হয়েছে!`);
                } catch (err) {
                    console.error('CSV পার্স করতে সমস্যা হয়েছে:', err.message);
                }
            });
        }).on('error', (err) => {
            console.error('গুগল শিট থেকে ডাটা ফেচ করতে সমস্যা হয়েছে:', err.message);
        });
    };

    getCSV(SHEET_CSV_URL);
}

// সার্ভার চালু হওয়ার সাথে সাথেই প্রথমবার ব্যাকগ্রাউন্ডে ডাটা নিয়ে আসবে
fetchSheetData();

// প্রতি ১ মিনিট (60,000 মিলি-সেকেন্ড) পর পর স্বয়ংক্রিয়ভাবে গুগল শিট থেকে নতুন ডাটা আপডেট করবে
setInterval(fetchSheetData, 60000);

// public ফোল্ডারে থাকা index.html সহ অন্যান্য ফাইলগুলো সার্ভ করা
app.use(express.static(path.join(__dirname, 'public')));

// আপনার ওয়েবসাইটের ফ্রন্টএন্ড বা গুগল ক্রলারের জন্য ফাস্ট API
app.get('/api/posts', (req, res) => {
    res.json({
        success: true,
        total: cachedPosts.length,
        posts: cachedPosts
    });
});

// মূল সার্ভার চালু করা
app.listen(PORT, () => {
    console.log(`Bs-Sarvar port ${PORT}-এ সফলভাবে চালু হয়েছে!`);
});
