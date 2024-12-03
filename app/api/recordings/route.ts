import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand, CopyObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configure AWS S3 Client
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2', // Make sure this is the correct region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'ece665recordings--use2-az1--x-s3';

// List all recordings in the S3 bucket
async function listRecordings() {
  try {
    const command = new ListObjectsV2Command({ Bucket: BUCKET_NAME });
    const data = await s3.send(command);
    console.log('Recordings:', data.Contents);
    return data.Contents || [];
  } catch (error) {
    console.error('Error fetching recordings:', error);
    throw new Error('Failed to fetch recordings from S3.');
  }
}

// Get a presigned URL for a file
async function getPresignedUrl(fileName: string) {
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: fileName });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // URL valid for 1 hour
    return url;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error('Failed to generate presigned URL.');
  }
}

// Delete a file from the S3 bucket
async function deleteRecording(fileName: string) {
  try {
    const command = new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: fileName });
    await s3.send(command);
    return { success: true, message: `Deleted file: ${fileName}` };
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw new Error('Failed to delete file.');
  }
}

// Rename a file in S3 (copy it to a new name and then delete the old one)
async function renameRecording(oldFileName: string, newFileName: string) {
  try {
    // Copy the file to the new name
    const copyCommand = new CopyObjectCommand({
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${oldFileName}`,
      Key: newFileName,
    });
    await s3.send(copyCommand);

    // Delete the old file after copying
    await deleteRecording(oldFileName);
    return { success: true, message: `Renamed file from ${oldFileName} to ${newFileName}` };
  } catch (error) {
    console.error('Error renaming file in S3:', error);
    throw new Error('Failed to rename file.');
  }
}

// API route handler
export async function GET() {
  try {
    const recordings = await listRecordings();
    return NextResponse.json({ recordings });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
    }
  }
}

export async function POST(req: Request) {
    const { action, fileName, oldFileName, newFileName } = await req.json();
  
    try {
      if (action === 'rename' && oldFileName && newFileName) {
        const result = await renameRecording(oldFileName, newFileName);
        return NextResponse.json(result);
      }
      if (action === 'delete' && oldFileName) {
        const result = await deleteRecording(oldFileName);
        return NextResponse.json(result);
      }
      if (action === 'presigned-url' && fileName) {
        // Generate the presigned URL for the requested file
        const url = await getPresignedUrl(fileName);
        return NextResponse.json({ url });
      }
      return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 });
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      } else {
        return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
      }
    }
  }
