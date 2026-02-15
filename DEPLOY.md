# Deploy: Backend on AWS, Frontend on Vercel

- **Backend + MongoDB** → AWS EC2 (Docker, from Docker Hub)
- **Frontend** → Vercel (Dashboard app)

---

## Part 1: Push backend to Docker Hub (no frontend)

### 1. Log in to Docker Hub
```powershell
docker login
```
Use username **umairimran627** and your password.

### 2. Build and tag only the backend
```powershell
cd C:\Users\User\Desktop\invoiceProjectNew
docker compose build backend
docker tag invoiceprojectnew-backend:latest umairimran627/invoiceproject-backend:latest
```

### 3. Push only the backend image
```powershell
docker push umairimran627/invoiceproject-backend:latest
```

You do **not** push the frontend image — the frontend will be deployed on Vercel.

---

## Part 2: Deploy backend on AWS (EC2)

### 1. Launch EC2 instance
- **AWS Console** → EC2 → Launch instance.
- **AMI:** Amazon Linux 2023 or Ubuntu 22.04.
- **Instance type:** e.g. t2.micro or t3.small.
- **Key pair:** Create or select; download the `.pem` file.
- **Security group:** Allow:
  - **22** (SSH) from your IP
  - **8000** (API) from 0.0.0.0/0 (so Vercel frontend and browsers can call the API)
- Launch and note the **public IP** (e.g. `3.110.xxx.xxx`). This is your **backend URL**: `http://YOUR_EC2_IP:8000`.

### 2. Connect to the server
```powershell
ssh -i "path\to\your-key.pem" ec2-user@YOUR_EC2_PUBLIC_IP
```
(Use `ubuntu@...` if you chose Ubuntu.)

### 3. Install Docker and Docker Compose
**Amazon Linux 2023:**
```bash
sudo yum update -y
sudo yum install docker -y
sudo systemctl start docker && sudo systemctl enable docker
sudo usermod -aG docker ec2-user
```
Log out and log back in, then:
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

**Ubuntu 22.04:**
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo systemctl start docker && sudo systemctl enable docker
sudo usermod -aG docker $USER
```
Log out and log back in.

### 4. Create app folder and .env on the server
```bash
mkdir -p ~/invoiceapp && cd ~/invoiceapp
nano .env
```

Paste (replace with your values):
```env
MONGODB_URI=mongodb://mongo:27017
DATABASE_NAME=bashayer_db
JWT_SECRET=your-secret-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=60
GOOGLE_API_KEY=your-google-api-key
```
Save (Ctrl+O, Enter, Ctrl+X). No `NEXT_PUBLIC_*` here — that is only for the frontend on Vercel.

### 5. Copy production compose to the server
From your PC (PowerShell):
```powershell
scp -i "path\to\your-key.pem" C:\Users\User\Desktop\invoiceProjectNew\docker-compose.prod.yml ec2-user@YOUR_EC2_PUBLIC_IP:~/invoiceapp/docker-compose.yml
```

### 6. Pull and run (backend + MongoDB only)
On the server:
```bash
cd ~/invoiceapp
docker compose pull
docker compose up -d
```

### 7. Verify
```bash
docker compose ps
```
You should see **mongo** and **backend** only.

- **API:** `http://YOUR_EC2_PUBLIC_IP:8000`  
  Test: `http://YOUR_EC2_PUBLIC_IP:8000/health`

---

## Part 3: Deploy frontend on Vercel

### 1. Backend URL
Your backend is at: **`http://YOUR_EC2_PUBLIC_IP:8000`**  
The frontend must call: **`http://YOUR_EC2_PUBLIC_IP:8000/api`**

### 2. Push Dashboard to GitHub (if not already)
Ensure the `Dashboard` app (or the repo that contains it) is on GitHub.

### 3. Import project in Vercel
- Go to [vercel.com](https://vercel.com) and sign in (e.g. with GitHub).
- **Add New** → **Project** → Import the repo that contains the Dashboard (e.g. `invoiceProjectNew` with root or `Dashboard` as root, depending on your repo layout).
- If Vercel asks for **Root Directory**, set it to **`Dashboard`** if the Next.js app is inside that folder.

### 4. Set environment variable in Vercel
In the project settings (or during import), add:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_API_URL` | `http://YOUR_EC2_PUBLIC_IP:8000/api` |

Replace `YOUR_EC2_PUBLIC_IP` with your real EC2 IP (e.g. `http://3.110.xxx.xxx:8000/api`).

### 5. Deploy
Vercel will build and deploy. Your app will be at `https://your-project.vercel.app` and will call your AWS backend.

### 6. CORS
Your backend already allows all origins (`allow_origins=["*"]` in `main.py`), so the Vercel domain can call the API. If you later restrict CORS, add your Vercel URL (e.g. `https://your-project.vercel.app`) to `CORS_ORIGINS` in the backend `.env` on the server.

---

## Summary

| What | Where | Action |
|------|--------|--------|
| Backend image | Docker Hub | Push only `umairimran627/invoiceproject-backend:latest` |
| Backend + MongoDB | AWS EC2 | Use `docker-compose.prod.yml` (mongo + backend only), open port 8000 |
| Frontend | Vercel | Import Dashboard, set `NEXT_PUBLIC_API_URL` to `http://EC2_IP:8000/api` |

- **Frontend (Vercel):** `https://your-project.vercel.app`  
- **Backend (AWS):** `http://YOUR_EC2_IP:8000`

No frontend image on Docker Hub; no frontend container on AWS.
