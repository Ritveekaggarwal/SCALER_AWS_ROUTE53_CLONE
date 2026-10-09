import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Route 53 Console",
  description: "A clone of the AWS Route 53 console: hosted zones and DNS records.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("r53-theme");var d=t==="light"?false:t==="system"?matchMedia("(prefers-color-scheme: dark)").matches:true;if(d)document.body.classList.add("awsui-dark-mode");}catch(e){document.body.classList.add("awsui-dark-mode")}`,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
