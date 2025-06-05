import { ReactNode } from 'react';

declare module '@/components/StockDataInformation' {
  const StockDataInformation: () => ReactNode;
  export default StockDataInformation;
}

declare module '@/components/DatabaseOperations' {
  const DatabaseOperations: () => ReactNode;
  export default DatabaseOperations;
}

declare module '@/components/AvailableStocks' {
  const AvailableStocks: () => ReactNode;
  export default AvailableStocks;
}

declare module '@/components/StockList' {
  const StockList: () => ReactNode;
  export default StockList;
}

declare module '@/components/StockManager' {
  const StockManager: () => ReactNode;
  export default StockManager;
} 