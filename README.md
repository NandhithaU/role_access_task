# Role and Access Management API

This API provides role-based access control for users and enforces access permissions based on roles and access flags. It is designed to be used in applications that require fine-grained control over user permissions.

## Features

- Role-based access control (RBAC)
- User authentication using JWT tokens
- Creation, retrieval, update, and deletion of user profiles
- Logging of user operations
- Fine-grained access control using access flags
- ...

## Getting Started
### Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js and npm installed on your machine
- MySQL database set up and running
- Git installed (for version control)

### Installation

1. Clone the repository:

   git clone https://github.com/NandhithaU/role_access_task.git

API:
===
POST /users: Create a new user profile.
GET /users/:id: Retrieve user details by ID.
PUT /users/:id: Update user information.
DELETE /users/:id: Delete a user profile.
GET /logs: Retrieve logs of user operations.
POST /feeds: Create a new feed for a profile.
GET /feeds/url: Retrieve feed details by url.
PUT /feeds/url: Update feed information.
DELETE /feeds/url: Delete a feed of a profile.
POST /login: login api
POST /signup: create a new profile

