import Image from "next/image";
import styles from "./page.module.css";
import { HomeComponent } from '@/components/HomeComponent';

export const metadata = {
  title: 'My Page',
  description: 'Description of my page',
  other: {
    'fc:frame': JSON.stringify({
      version: "next",
      imageUrl: "https://placehold.co/600x400/orange/white/png?text=Preview+Image",
      button: {
        title: "Try now!",
        action: {
          type: "launch_frame",
          name: "your-frame-name",
          url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
          splashImageUrl: "https://placehold.co/200x200/blue/white/png?text=Splash+Image",
          splashBackgroundColor: "#ffffff"
        }
      }
    })
  }
};

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <HomeComponent />
      </main>
    </div>
  );
}
