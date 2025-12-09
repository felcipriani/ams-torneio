import { NextRequest, NextResponse } from 'next/server';
import formidable from 'formidable';
import { IncomingMessage } from 'http';
import { Readable } from 'stream';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { Meme } from '@/types';
import { InMemoryTournamentRepository } from '@/server/in-memory-repository';

// Create a singleton repository instance
const repository = new InMemoryTournamentRepository();

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
];

/**
 * Convert Next.js request to Node.js IncomingMessage for formidable
 */
async function convertToIncomingMessage(request: NextRequest): Promise<IncomingMessage> {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const readable = new Readable({
    read() {}
  });

  // Get the request body as array buffer and push to readable stream
  const arrayBuffer = await request.arrayBuffer();
  readable.push(Buffer.from(arrayBuffer));
  readable.push(null);

  // Create a mock IncomingMessage
  const incomingMessage = readable as any as IncomingMessage;
  incomingMessage.headers = headers;

  return incomingMessage;
}

/**
 * Parse multipart form data using formidable
 */
async function parseForm(req: IncomingMessage): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  const form = formidable({
    maxFileSize: MAX_FILE_SIZE,
    keepExtensions: true,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
}

/**
 * Validate file size
 */
function validateFileSize(fileSize: number): { valid: boolean; error?: string } {
  if (fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of 5MB. File size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`
    };
  }
  return { valid: true };
}

/**
 * Validate file MIME type
 */
function validateFileType(mimeType: string | null): { valid: boolean; error?: string } {
  if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: PNG, JPG, JPEG, WEBP. Received: ${mimeType || 'unknown'}`
    };
  }
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    // Convert Next.js request to IncomingMessage for formidable
    const incomingMessage = await convertToIncomingMessage(request);

    // Parse multipart form data
    const { fields, files } = await parseForm(incomingMessage);

    // Extract the file from the parsed data
    const fileArray = files.file;
    if (!fileArray || (Array.isArray(fileArray) && fileArray.length === 0)) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;

    // Validate file size
    const sizeValidation = validateFileSize(file.size);
    if (!sizeValidation.valid) {
      return NextResponse.json(
        { error: sizeValidation.error },
        { status: 400 }
      );
    }

    // Validate file type
    const typeValidation = validateFileType(file.mimetype);
    if (!typeValidation.valid) {
      return NextResponse.json(
        { error: typeValidation.error },
        { status: 400 }
      );
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const fileExtension = path.extname(file.originalFilename || '');
    const uniqueFilename = `${randomUUID()}${fileExtension}`;
    const destinationPath = path.join(uploadsDir, uniqueFilename);

    // Process image with sharp and save
    const fileBuffer = await fs.readFile(file.filepath);
    await sharp(fileBuffer)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
      .toFile(destinationPath);

    // Clean up temporary file
    await fs.unlink(file.filepath);

    // Extract caption from form fields
    const captionArray = fields.caption;
    const caption = Array.isArray(captionArray) ? captionArray[0] : (captionArray || '');

    // Create meme object
    const meme: Meme = {
      id: randomUUID(),
      imageUrl: `/uploads/${uniqueFilename}`,
      caption: caption as string,
      uploadedAt: new Date()
    };

    // Store meme via repository
    await repository.addMeme(meme);

    // Return meme metadata
    return NextResponse.json({
      success: true,
      meme: {
        id: meme.id,
        imageUrl: meme.imageUrl,
        caption: meme.caption,
        uploadedAt: meme.uploadedAt
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Upload error:', error);

    // Handle formidable file size errors
    if (error.code === 'LIMIT_FILE_SIZE' || error.message?.includes('maxFileSize')) {
      return NextResponse.json(
        { error: 'File size exceeds maximum allowed size of 5MB' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to upload file', details: error.message },
      { status: 500 }
    );
  }
}
