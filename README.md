# AuroraStay — Installation & Setup Guide

## 1. Install the Required Software

Before running AuroraStay, install the following:

* **[Git](https://git-scm.com/downloads)**
* **[Node.js](https://nodejs.org/en/download)**
* **[PostgreSQL 18](https://www.postgresql.org/download/)**
* **[pgAdmin 4](https://www.pgadmin.org/download/)**
* **[Visual Studio Code (VS Code)](https://code.visualstudio.com/download)**

---

## 2. Set Up PostgreSQL

After installing **PostgreSQL 18** and **pgAdmin 4**:

1. Open **pgAdmin 4**.
2. Create a PostgreSQL user.
3. Set a password for the user.
4. Make sure the PostgreSQL server is running.

### If PostgreSQL does not start

Open **Command Prompt (CMD)** and run:

```cmd
"C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\18\data"
```

---

## 3. Clone the AuroraStay Project

Open **Visual Studio Code**.

Create or select a folder where you want to store the project.

Open the VS Code terminal:

```text
Ctrl + `
```

Then run:

```bash
git clone https://github.com/Nanashi0007/AuroraStay
```

Go into the project:

```bash
cd AuroraStay
```

---

## 4. Set Up the Client

In the terminal, go to the client folder:

```bash
cd client
```

Create a new file named:

```text
.env
```

Paste the provided credentials into the `.env` file.

> **Note:** Contact the project administrator/developer for the required credentials.

After creating the `.env` file, install the client dependencies:

```bash
npm install
```

---

## 5. Set Up the Server

Open a **new VS Code terminal**:

```text
Ctrl + Shift + `
```

Go to the project folder:

```bash
cd AuroraStay
```

Then go to the server folder:

```bash
cd server
```

Create a new file named:

```text
.env
```

Paste the provided server credentials into the `.env` file.

> **Note:** Contact the project administrator/developer for the required credentials.

Install the server dependencies:

```bash
npm install
```

---

## 6. Start the Server

Inside the `server` folder, run:

```bash
node server.js
```

Keep this terminal running. You should see a message indicating that the server has started successfully.

---

## 7. Start the Client

Go back to the terminal where you previously ran `cd client`, then run:

```bash
npm run dev
```

Vite will provide a local URL, usually:

```text
http://localhost:5173
```

Open the provided URL in your browser.

---

## 8. Terminal Setup

When running AuroraStay, you should have **two terminals** open:

### Terminal 1 — Server

```bash
cd AuroraStay
cd server
node server.js
```

### Terminal 2 — Client

```bash
cd AuroraStay
cd client
npm run dev
```

**Do not close either terminal while using the application.**

---

## Quick Setup Summary

If all required software is already installed:

### Terminal 1

```bash
git clone https://github.com/Nanashi0007/AuroraStay
cd AuroraStay
cd client
```

Create `client/.env`, add the required credentials, then:

```bash
npm install
```

### Terminal 2

```bash
cd AuroraStay
cd server
```

Create `server/.env`, add the required credentials, then:

```bash
npm install
node server.js
```

### Back to Terminal 1

```bash
npm run dev
```

Then open the URL provided by Vite.
