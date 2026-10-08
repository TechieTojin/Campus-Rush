const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const MAX_BYTES = 2 * 1024 * 1024;
const IMAGE_PATH = /^\/uploads\/[a-f0-9]{32}\.(jpg|png|webp)$/;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// The declared Content-Type is not trusted; the file signature decides the type.
const sniff = (buf) => {
    if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
    if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
    return null;
};

exports.rawImage = express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: MAX_BYTES });

exports.uploadImage = async (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ message: 'Send a JPG, PNG or WebP image (max 2 MB)' });
    }
    const ext = sniff(req.body);
    if (!ext) {
        return res.status(415).json({ message: 'File is not a valid JPG, PNG or WebP image' });
    }
    const name = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
    try {
        await fs.promises.writeFile(path.join(UPLOAD_DIR, name), req.body, { flag: 'wx' });
        return res.status(201).json({ url: `/uploads/${name}`, bytes: req.body.length });
    } catch (error) {
        console.error('Image upload failed:', error);
        return res.status(500).json({ message: 'Could not save the image' });
    }
};

// '' clears an image; anything else must be a file this server stored.
exports.isValidImagePath = (value) =>
    value === '' || (typeof value === 'string' && IMAGE_PATH.test(value) && fs.existsSync(path.join(UPLOAD_DIR, path.basename(value))));

exports.serveUploads = express.static(UPLOAD_DIR, {
    index: false,
    dotfiles: 'deny',
    fallthrough: false,
    maxAge: '7d',
    setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'");
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
});

// Turns body-parser's size error into a readable message.
exports.uploadErrors = (err, req, res, next) => {
    if (err && err.type === 'entity.too.large') {
        return res.status(413).json({ message: 'Image is larger than 2 MB' });
    }
    return next(err);
};
