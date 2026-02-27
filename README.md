#  HostelOps

HostelOps is a full-stack complaint management system designed to streamline maintenance requests within student accommodations. It features a secure, cloud-native authentication flow using AWS Cognito, role-based access control (RBAC) for Students and Admins, and a containerized deployment architecture using Docker and AWS EC2.

##  Features

* **Cloud-Native Authentication:** Fully integrated with **AWS Cognito** for secure user login, registration, and identity management via JWTs (JSON Web Tokens).
* **Role-Based Access Control (RBAC):**
    * **Students:** Can submit new complaints (Category, Description, Priority) and view their own complaint history.
    * **Admins:** Have a dedicated dashboard to view all campus complaints, filter by category/status, and update resolutions (e.g., Pending → Resolved).
* **Secure API:** Backend routes are protected using `jwks-rsa` and `jsonwebtoken` to mathematically verify Cognito ID tokens before interacting with the database.
* **Containerized Infrastructure:** Both frontend and backend are containerized using Docker and orchestrated via Docker Compose, served behind an Nginx reverse proxy.

##  Tech Stack

* **Frontend:** React.js, React Router, `react-oidc-context` (AWS Cognito Hosted UI integration)
* **Backend:** Node.js, Express.js
* **Database:** PostgreSQL (AWS RDS)
* **Infrastructure & Cloud:**
    * **AWS EC2:** Application hosting with Elastic IP.
    * **AWS ECR:** Private Docker container registry.
    * **AWS Cognito:** User Pools and Identity management.
    * **Docker & Docker Compose:** Containerization and orchestration.
    * **Nginx:** Reverse proxy handling web traffic routing.
    * **GitHub Actions:** Automated CI/CD pipeline.

---

##  Architecture overview

1.  **Authentication:** The React frontend redirects users to the AWS Cognito Hosted UI. Upon successful login, Cognito returns an `id_token`.
2.  **API Requests:** The frontend attaches the `id_token` as a `Bearer` token in the `Authorization` header for all backend `fetch` requests.
3.  **Verification:** The Node.js Express backend uses a custom middleware (`verifyToken`) to validate the token's signature against AWS Cognito's public JWKS keys.
4.  **Authorization:** The backend reads the `custom:role` attribute embedded in the decoded token to grant or deny access to Admin-specific database queries.

---

##  CI/CD Pipeline

HostelOps utilizes **GitHub Actions** for a fully automated Continuous Integration and Continuous Deployment (CI/CD) pipeline. 

Whenever changes are pushed to the `main` branch, the following automated workflow triggers:
1. **Build & Tag:** GitHub Actions checks out the code, logs into AWS ECR, and builds the latest Docker images for both the `frontend` and `backend`. The images are tagged with both `latest` and a unique `github.sha` commit hash for version control.
2. **Push to ECR:** The newly built container images are pushed securely to the Amazon Elastic Container Registry (ECR).
3. **Deploy to EC2:** Upon successful build and push, the pipeline securely connects to the AWS EC2 instance via SSH.
4. **Automated Rollout:** The EC2 server automatically pulls the new `latest` images from ECR and executes `docker-compose up -d` to seamlessly recreate and restart the application containers in the background with zero downtime.

---

##  Local Development Setup

### Prerequisites
* Node.js (v16+)
* Docker & Docker Compose
* An AWS Account (with a configured Cognito User Pool)

### 1. Clone the repository
```bash
git clone [https://github.com/yourusername/HostelOps.git](https://github.com/yourusername/HostelOps.git)
cd HostelOps
