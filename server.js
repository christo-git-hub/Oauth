require("dotenv").config();
const express = require("express");
const session = require("express-session");
const { google } = require("googleapis");
const path = require("path");

const app = express();
const port = 3000;

// Serve static files (CSS, JS) from the "public" folder
app.use(express.static(path.join(__dirname, "public")));

// Session setup
app.use(session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true
}));

// Google OAuth2 setup
const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI
);

// Login route - Redirects user to Google's OAuth2.0 consent screen
app.get("/login", (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/drive.readonly"]
    });
    res.redirect(authUrl);
});

// Callback route - Handles authentication response from Google
app.get("/auth/callback", async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.send("Error: No code received");
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        req.session.tokens = tokens;
        res.redirect("/files"); // Redirect to file listing page
    } catch (error) {
        console.error("Error getting tokens:", error);
        res.send("Authentication failed");
    }
});

// Files route - List files from Google Drive
app.get("/files", async (req, res) => {
    if (!req.session.tokens) {
        return res.redirect("/login");
    }

    oauth2Client.setCredentials(req.session.tokens);
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    try {
        const response = await drive.files.list({
            pageSize: 100,
            fields: "files(id, name, webViewLink, webContentLink)"
        });

        const files = response.data.files;

        let fileListHTML = `
        <html>
        <head>
            <title>Google Drive Files</title>
            <link rel="stylesheet" href="/style.css">  <!-- FIXED CSS LINK -->
        </head>
        <body>
            <div class="container">
                <h2>Your Google Drive Files</h2>
                <ul class="file-list">
        `;

        files.forEach(file => {
            fileListHTML += `
                <li class="file-item">
                    <span class="file-name">${file.name}</span>
                    <a class="view-btn" href="${file.webViewLink}" target="_blank">View</a>
                    <a class="download-btn" href="${file.webContentLink}" download>Download</a>
                </li>
            `;
        });

        fileListHTML += `
                </ul>
                <a href="/" class="logout-btn">Go Back</a>
            </div>
        </body>
        </html>`;

        res.send(fileListHTML);
    } catch (error) {
        console.error("Error fetching files:", error);
        res.status(500).send("Failed to load files.");
    }
});

// Logout route - Clears session
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

// Home route - Displays login button
app.get("/", (req, res) => {
    res.send(`
        <html>
        <head>
            <title>Google OAuth Demo</title>
            <link rel="stylesheet" href="/style.css">  <!-- FIXED CSS LINK -->
        </head>
        <body>
            <div class="container">
                <h2>Login with Google to Access Your Drive Files</h2>
                <a href="/login"><button class="login-btn">Login with Google</button></a>
            </div>
        </body>
        </html>
    `);
});

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});