# Sasta Swipe 💳💸

Sasta Swipe is a next-generation web application built for the Pakistani market that aggregates credit and debit card dining discounts in real-time. Stop hunting through dozens of different bank websites and static PDF catalogs just to figure out where you can eat for less. 

With Sasta Swipe, simply enter your bank and card type, and our engine automatically fetches, parses, and presents the latest live dining deals available to you. 

## ✨ Features

- **Real-Time Deal Scraping**: Scrapes directly from bank directories (via Peekaboo and other sources) using Headless Playwright.
- **AI-Powered Parsing**: Uses Gemini AI to intelligently extract merchant names, discount percentages, maximum caps, and terms/conditions from unstructured web data.
- **Dynamic Cap Calculator**: Click on any deal to open the Bill Calculator. Enter your bill amount, and it automatically calculates your final payable amount factoring in the exact discount limit (max cap) and standard GST (8%).
- **Smart Filtering & Searching**: Filter by City, Bank, and Card type. Or optionally, search for a specific restaurant (e.g. "Arcadian") to immediately see if it has an active discount on your card.
- **AI Chatbot Assistant**: Ask natural language questions like *"What's the discount on Kababjees for my HBL Platinum card?"* and the AI will scrape, calculate, and answer you dynamically!
- **User Accounts & Saved Cards**: Create an account to securely save your active cards for 1-click access to your personalized deals.
- **Premium Glassmorphic UI**: A stunning, modern, dark-mode first design with smooth micro-animations.

## 🚀 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Vanilla CSS (CSS Modules & Globals)
- **Database**: SQLite (via `sqlite3` for local user/preference storage)
- **Web Scraping**: Playwright (`playwright-core`)
- **AI Integration**: Google Gen AI SDK (`@google/genai` using Gemini 3.1 Flash-Lite)
- **Authentication**: Custom JWT-based / Google OAuth routing via Next API routes.

## ⚙️ Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/sasta-swipe.git
   cd sasta-swipe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   # Add your Google OAuth keys if testing authentication
   ```

4. **Install Playwright Browsers**
   ```bash
   npx playwright install chromium
   ```

5. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` to see the app in action!

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 

## 📝 License

This project is licensed under the MIT License.
