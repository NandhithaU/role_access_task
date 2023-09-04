Role Access Task - Express TypeScript MySQL
==========================================
This is a sample project that demonstrates role-based access control (RBAC) and user authentication using Express.js, TypeScript, and MySQL. It allows you to create, read, update, and delete users and feeds based on user roles and access flags.

Features
=========
User Management: Create, read, update, and delete users with different roles.
Feed Management: Create, read, update, and delete feeds with role-based access control.
Authentication: Secure user authentication using bcrypt for password hashing.
Logging: Logging user operations and viewing logs.
Role-Based Access: Control access to routes based on user roles and access flags.
Express Middleware: Utilizes Express middleware for authentication and role-based access control.
Prerequisites
Before running the project, make sure you have the following installed:

Node.js
npm
MySQL


Installation:
============
1.Clone the repository:
git clone https://github.com/yourusername/role_access_task.git


2.Navigate to the project directory:
cd role_access_task

3.Install the dependencies:
npm install

Configuration
==============
Create a MySQL database and configure the connection details in the conf/config.ts file.
Set your secret key for JWT token generation in the code.

Usage

Start the Express server:
npm start

Access the application at http://localhost:7000.

Endpoints
POST /users: Create a new user. Requires admin privileges.
GET /users/:id: Get user details by ID. Requires admin or user with access.
PUT /users/:id: Update user information by ID. Requires admin or user with access.
DELETE /users/:id: Delete a user by ID. Requires admin privileges.
GET /logs: View logs of recent operations. Requires admin privileges.
POST /login: User authentication endpoint.
POST /signup: User registration endpoint.
POST /feeds: Create a new feed. Requires admin or user with access.
GET /feeds/:url: Get feed details by URL. Requires admin, user with access, or basic access.
PUT /feeds/:url: Update feed information by URL. Requires admin or user with access.
DELETE /feeds/:url: Delete a feed by URL. No role restrictions.