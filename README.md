# Value Stock Screener

A web application that helps identify undervalued stocks based on Benjamin Graham's value investing principles. The app automatically collects and analyzes US stock data, presenting a sorted list of potentially undervalued stocks.

## Features

- Automatic collection of US stock data
- Calculation of Graham Number for value assessment
- Real-time stock data updates
- Clean and intuitive user interface
- Sortable stock metrics
- Supabase database integration

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Supabase
- Finnhub API

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Finnhub API key

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_api_key
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/value-stock-screener.git
cd value-stock-screener
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Supabase Setup

1. Create a new Supabase project
2. Create a `stocks` table with the following schema:

```sql
create table stocks (
  symbol text primary key,
  company_name text,
  price numeric,
  pe_ratio numeric,
  pb_ratio numeric,
  graham_number numeric,
  eps numeric,
  book_value_per_share numeric,
  last_updated timestamp with time zone
);
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 