# Secure Password Reset Implementation Guide

This document outlines the modern landscape for implementing a secure forgot/reset password feature, focusing on secure, open-source options.

### Core Components of a Secure Password Reset Flow

A secure flow involves these steps:
1.  **User Initiation**: The user enters their email on a `/forgot-password` page.
2.  **Token Generation**: The backend generates a unique, secure, and short-lived token associated with that user.
3.  **Secure Delivery**: The token is sent to the user's registered email address via a "magic link".
4.  **User Action**: The user clicks the link, is taken to a `/reset-password` page, and the token is passed in the URL.
5.  **Token Verification**: The backend verifies the token is valid and hasn't expired.
6.  **Password Update**: The user provides a new password, which the backend validates and then hashes before storing it, invalidating the reset token.

### Latest Developments & Approaches

The most significant recent development is the move towards **passwordless authentication**, which often uses the same "magic link" or One-Time Password (OTP) mechanism. The key is to avoid reinventing the wheel for security-critical parts like token generation and validation.

Here are the two main approaches:

#### 1. The "DIY" (Do-It-Yourself) Logic + Transactional Email Service

You build the password reset logic yourself within your Express backend and use an external service just for sending the email.

*   **How it Works**:
    1.  In your `/api/auth/forgot-password` endpoint, you'd generate a cryptographically secure random token (e.g., using `crypto.randomBytes`).
    2.  You'd store a hash of this token in your database with the user's ID and an expiration timestamp (e.g., 15-30 minutes).
    3.  You use a transactional email service to send the reset link.
*   **Pros**: Full control over the logic.
*   **Cons**: **High security risk.** It's very easy to make a mistake in token generation, storage (never store raw tokens!), or verification that could compromise user accounts. You are responsible for the entire security lifecycle.
*   **External Service Needed**: A reliable **Transactional Email Service**.
    *   **Resend**: A modern, developer-focused email service with a generous free tier. It's extremely popular with the Next.js/React ecosystem.
    *   **SendGrid, Mailgun**: Established players with robust APIs and free tiers.

#### 2. Managed Open-Source Identity Platforms (Recommended)

This is the modern, more secure approach. You use a dedicated open-source service that handles the entire user identity lifecycle, including password resets. You interact with its API from your backend.

*   **How it Works**: Your backend receives the request, but instead of generating tokens yourself, you call the identity service's API. It handles token generation, secure storage, and verification. You just build the email content.
*   **Pros**: Drastically improved security (delegates the hard parts to experts), faster development, and handles edge cases you might not think of.
*   **Cons**: Adds an external dependency to your stack.

### Recommended Open-Source Identity Services

Based on your stack (Node.js/TypeScript) and requirements, here are the top open-source contenders:

1.  **SuperTokens (Highly Recommended)**
    *   **What it is**: An open-source authentication platform built for developers. It's designed to be easy to integrate and highly secure. It can be self-hosted or used as a managed service.
    *   **Why it's a great fit**:
        *   **Security First**: Handles all the complex security logic for you (token generation, expiry, preventing timing attacks).
        *   **Excellent SDKs**: Has a dedicated Node.js SDK that will integrate perfectly with your backend.
        *   **Flexible**: You can use their pre-built UI or call the backend API directly for a "headless" implementation.
        *   **Open Source**: Core is fully open-source (Apache 2.0), so you can self-host it for complete control.

2.  **Ory (Kratos)**
    *   **What it is**: A suite of open-source, API-first services for identity (Kratos), permissions (Keto), and more.
    *   **Why it's a good fit**: It's "headless" by design, perfect for custom frontends. It's highly secure and scalable.
    *   **Consideration**: Can have a steeper learning curve than SuperTokens.

3.  **Keycloak**
    *   **What it is**: A mature and feature-rich open-source identity and access management solution from Red Hat.
    *   **Consideration**: It's Java-based, which might feel less integrated with a Node.js stack.

### Final Recommendation

For the ODRLab project, the recommended combination is:

*   **Identity Logic**: **SuperTokens**. It provides the best balance of security, developer experience, and flexibility.
*   **Email Delivery**: **Resend**. It's modern, simple, and has a great free tier.

### Implementation Plan Outline

1.  **Setup SuperTokens**:
    *   Decide on self-hosting vs. managed service.
    *   Install and initialize the SuperTokens Node.js SDK in the `@backend` project.
2.  **Setup Resend**:
    *   Get an API key and add it to your environment variables.
    *   Install the Resend SDK.
3.  **Backend API Implementation (`@backend/src/api/auth/`)**:
    *   **Create `POST /forgot-password` endpoint**:
        *   Receives email.
        *   Calls `SuperTokens.generatePasswordResetToken(userId)`.
        *   Uses Resend to email the reset link.
    *   **Create `POST /reset-password` endpoint**:
        *   Receives `token` and `newPassword`.
        *   Calls `SuperTokens.resetPassword(token, newPassword)`.
        *   Returns a success message.
4.  **Frontend Integration (`@odrindia/src/`)**:
    *   The `/forgot-password` page POSTs the email to the new backend endpoint.
    *   The `/reset-password` page reads the token from the URL and POSTs the token and new password.
