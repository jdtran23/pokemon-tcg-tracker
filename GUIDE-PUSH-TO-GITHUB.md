# How to Push Updates to GitHub (So Railway Gets Updated)

This guide explains how to send your latest code changes to GitHub. When GitHub has the new code, Railway will automatically pick it up and redeploy your API with the buy/sell signals.

---

## Before You Start

You need:
- A GitHub account (free at [github.com](https://github.com))
- The project already connected to GitHub (if you followed DEPLOY.md, it is)
- Your changes saved on your computer

---

## Step 1: Open Terminal

**On Mac:**
1. Press **Cmd + Space** (opens Spotlight search)
2. Type **Terminal**
3. Press **Enter**

**On Windows:**
1. Press the **Windows** key
2. Type **cmd** or **Command Prompt**
3. Press **Enter**

---

## Step 2: Go to Your Project Folder

In the Terminal window, type this (or copy and paste), then press **Enter**:

```
cd Documents/PM-OS/pokemon-tcg-tracker
```

**If Railway is connected to the whole PM-OS repo** (the parent folder that contains pokemon-tcg-tracker), use this instead:
```
cd Documents/PM-OS
```

**If your folder is somewhere else:** Change the path. For example, if the folder is on your Desktop:
```
cd Desktop/pokemon-tcg-tracker
```

---

## Step 3: Save Your Changes for Git

Type each line below, one at a time, and press **Enter** after each:

**First command:**
```
git add .
```
(This tells Git to include all your updated files.)

**Second command:**
```
git commit -m "Add buy/sell signals and trend metrics"
```
(This saves those changes with a short note. You can change the message in quotes if you want.)

**Third command:**
```
git push
```
(This sends your changes to GitHub.)

---

## Step 4: What to Expect

- After **git push**, you may be asked for your GitHub username and password (or a personal access token). Enter them when prompted.
- If it says **"Everything up-to-date"**, your code was already on GitHub.
- If it shows progress like **"Counting objects..."** and **"Writing objects..."**, the push is working.

---

## Step 5: Let Railway Update

- If Railway is connected to your GitHub repo, it will usually **redeploy automatically** within a few minutes after the push.
- Go to [railway.app](https://railway.app) and open your project to see if a new deployment is running.
- When the deployment finishes (usually 1–2 minutes), your live API will have the new signal features.

---

## If Something Goes Wrong

**"fatal: not a git repository"**
- The folder might not be a Git project yet. You may need to run the initial setup from DEPLOY.md (Step 2) first.

**"Permission denied" or "Authentication failed"**
- GitHub no longer accepts account passwords for pushes. You need a **Personal Access Token**:
  1. Go to [github.com](https://github.com) and sign in
  2. Click your profile picture (top right) → **Settings**
  3. Scroll down and click **Developer settings**
  4. Click **Personal access tokens** → **Tokens (classic)**
  5. Click **Generate new token**
  6. Give it a name (e.g. "Railway deploy")
  7. Check the box for **repo**
  8. Click **Generate token**
  9. Copy the token (it looks like `ghp_xxxxxxxxxxxx`)
  10. When `git push` asks for a password, paste the token instead

**"Updates were rejected"**
- Someone else may have pushed changes, or you're on a different branch. Ask for help or try:
  ```
  git pull
  git push
  ```

---

## Quick Cheat Sheet

| Step | Command |
|------|---------|
| 1. Go to folder | `cd Documents/PM-OS/pokemon-tcg-tracker` |
| 2. Stage changes | `git add .` |
| 3. Commit | `git commit -m "Add buy/sell signals"` |
| 4. Push to GitHub | `git push` |

---

**After the push:** Wait a few minutes for Railway to redeploy. Then your PokéMarket app should start receiving the signal data.
