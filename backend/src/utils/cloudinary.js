import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import { config } from '../config/env.js';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'school_erp',
    allowed_formats: ['jpg', 'png', 'jpeg', 'pdf', 'doc', 'docx'],
    resource_type: 'auto',
  },
});

const upload = multer({ storage: storage });

export { cloudinary,
  upload,
 };
