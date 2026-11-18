import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"StockPulse AI | Stock Intelligence",description:"Your personalized US and India stock-monitoring workspace."};
export default function RootLayout({children}:{children:React.ReactNode}) {
 return <html lang="en"><body>{children}</body></html>;
}
