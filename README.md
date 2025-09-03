# **JourneyScribe - Your All-in-One Travel Companion**

A next-generation platform for planning, booking, and sharing your travel adventures.

### **[View Live Demo](https://journey-scribe.vercel.app/)**

---

JourneyScribe is a full-stack web application designed to streamline every aspect of travel. From discovering new destinations and creating detailed itineraries to booking flights and hotels, JourneyScribe brings all your travel needs into one seamless, user-friendly experience. Share your journey with our community through blogs, chat with fellow travelers, and even track your expenses along the way.

---

## **Key Features**

* **Trip & Itinerary Planning**: Create detailed multi-day trips, add activities, and manage your schedule.
* **Flight Booking Engine**: Search for flights from major carriers, compare prices, and book tickets directly.
* **Hotel Reservations**: Find and book accommodations, from budget hostels to luxury resorts.
* **Community Blog**: Create and read travel blogs, share experiences, and comment on posts.
* **Real-time Chat**: Connect and chat with other users or trip members.
* **Expense Tracking**: Keep a detailed log of your travel expenses to stay on budget.
* **Smart Packing Lists**: Generate and manage packing lists so you never forget a thing.
* **Gamification & Achievements**: Earn badges and climb the leaderboard by exploring and contributing.
* **In-App & Push Notifications**: Stay updated on trip changes, social interactions, and booking confirmations.
* **Travel Tools**: A suite of handy tools including a currency converter, time zone converter, and more.
* **Secure Authentication**: Robust user authentication with forgot password and profile management.
* **Admin Dashboard**: A dedicated interface for administrators to manage users and content.

---

## **Tech Stack**

This project is built with a modern, robust, and scalable technology stack.

| Category   | Technology |
| :--------- | :--------- |
| **Framework** | Next.js    |
| **Frontend** | React      |
| **Backend** | Express.js |
| **Database** | Firebase   |
| **Deployment** | Vercel     |

---

## **Getting Started**

Follow these instructions to get a local copy of the project up and running for development and testing purposes.

### **Prerequisites**

* Node.js (v18.x or later recommended)
* npm / yarn / pnpm
* Credentials for Firebase, Amadeus, Brevo, and other required APIs.

### **Installation**

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/your-repo.git](https://github.com/your-username/your-repo.git)
    cd your-repo
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a file named `.env.local` in the project root. Copy the contents below and fill in your actual credentials.

    **Important:** Never commit your `.env.local` file to a public repository.

    ```env
    # .env.local

    APP_URL="http://localhost:3000"

    # For Firebase Client SDK (Safe to be public)
    NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
    NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"

    # For Firebase Admin SDK (Server-side only - KEEP SECRET)
    FIREBASE_PROJECT_ID="your-project-id"
    FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxx@your-project-id.iam.gserviceaccount.com"
    FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_MULTI_LINE_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

    # TimeZoneDB API Key (KEEP SECRET)
    TIMEZONEDB_API_KEY="YOUR_TIMEZONEDB_API_KEY"

    # For Amadeus API (KEEP SECRET)
    AMADEUS_API_KEY="YOUR_AMADEUS_API_KEY"
    AMADEUS_API_SECRET="YOUR_AMADEUS_API_SECRET"

    # For Brevo Email API (KEEP SECRET)
    BREVO_API_KEY="YOUR_BREVO_API_KEY"
    SENDER_EMAIL="your-verified-email@example.com"
    SENDER_NAME="JourneyScribe"

    # For IMGBB API (Safe to be public)
    NEXT_PUBLIC_IMGBB_API_KEY="YOUR_IMGBB_API_KEY"
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Open `http://localhost:3000` with your browser to see the result!

---

## **Contributing**

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## **License**

Distributed under the MIT License. See `LICENSE` for more information.
