const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({ margin: 50 });
const stream = fs.createWriteStream('Project_Run_Instructions.pdf');

doc.pipe(stream);

// Title
doc.fontSize(24).font('Helvetica-Bold').text('HomelyFood - Project Run Instructions', { align: 'center' });
doc.moveDown(2);

// Introduction
doc.fontSize(12).font('Helvetica').text('This document contains all the necessary commands and instructions to run the HomelyFood full-stack application locally. The project uses React (Vite) for the frontend, Express for the backend, and supports both SQLite (zero-config) and MongoDB for the database.');
doc.moveDown(1.5);

// Prerequisites
doc.fontSize(16).font('Helvetica-Bold').text('1. Prerequisites');
doc.moveDown(0.5);
doc.fontSize(12).font('Helvetica').text('Ensure you have the following installed on your machine:');
doc.list([
  'Node.js (v18 or higher recommended)',
  'npm (comes with Node.js)'
]);
doc.moveDown(1.5);

// Database Setup
doc.fontSize(16).font('Helvetica-Bold').text('2. Database Setup');
doc.moveDown(0.5);
doc.fontSize(12).font('Helvetica').text('By default, the application uses a local SQLite database (local.db) which requires zero configuration. It will automatically create the tables and seed default data when you start the server.');
doc.moveDown(0.5);
doc.text('If you prefer to use MongoDB:');
doc.list([
  'Create a file named .env in the root directory.',
  'Add your MongoDB connection string: MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/homelyfood'
]);
doc.moveDown(1.5);

// Installation
doc.fontSize(16).font('Helvetica-Bold').text('3. Installation');
doc.moveDown(0.5);
doc.fontSize(12).font('Helvetica').text('Open your terminal, navigate to the project root directory, and install the dependencies:');
doc.moveDown(0.5);
doc.font('Courier').text('npm install', { indent: 20 });
doc.moveDown(1.5);

// Running the Application (Development)
doc.fontSize(16).font('Helvetica-Bold').text('4. Running the Application (Development)');
doc.moveDown(0.5);
doc.fontSize(12).font('Helvetica').text('To start both the frontend (Vite) and backend (Express) concurrently in development mode, run:');
doc.moveDown(0.5);
doc.font('Courier').text('npm run dev', { indent: 20 });
doc.moveDown(0.5);
doc.font('Helvetica').text('The application will be accessible at: http://localhost:3000');
doc.moveDown(1.5);

// Building for Production
doc.fontSize(16).font('Helvetica-Bold').text('5. Building for Production');
doc.moveDown(0.5);
doc.fontSize(12).font('Helvetica').text('To compile the frontend assets and prepare the application for production deployment, run:');
doc.moveDown(0.5);
doc.font('Courier').text('npm run build', { indent: 20 });
doc.moveDown(1.5);

// Running in Production
doc.fontSize(16).font('Helvetica-Bold').text('6. Running in Production');
doc.moveDown(0.5);
doc.fontSize(12).font('Helvetica').text('After building the project, you can start the production server using:');
doc.moveDown(0.5);
doc.font('Courier').text('npm start', { indent: 20 });
doc.moveDown(1.5);

// Troubleshooting
doc.fontSize(16).font('Helvetica-Bold').text('7. Troubleshooting');
doc.moveDown(0.5);
doc.fontSize(12).font('Helvetica').text('If you encounter any issues:');
doc.list([
  'Ensure port 3000 is not being used by another application.',
  'If using MongoDB, verify your connection string and network access settings.',
  'Try deleting the node_modules folder and running "npm install" again if dependencies fail.'
]);

doc.end();

stream.on('finish', () => {
    console.log('PDF successfully written to disk.');
    process.exit(0);
});

stream.on('error', (err) => {
    console.error('Error writing PDF:', err);
    process.exit(1);
});
