import Image from "next/image";
import styles from "./page.module.css";
import { HomeComponent } from '@/components/HomeComponent';

export async function generateMetadata({ searchParams }) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const r2PublicUrl = process.env.R2_PUBLIC_URL;
  const R2_FOLDER_PREFIX = 'what-x-are-you/'; // Define the folder prefix

  let dynamicImageUrl = "https://placehold.co/600x400/orange/white/png?text=Preview+Image"; // Default
  
  const shareImageFileNameOnly = (await searchParams).image; 

  if (shareImageFileNameOnly && r2PublicUrl) {
    const base = r2PublicUrl.endsWith('/') ? r2PublicUrl : `${r2PublicUrl}/`;
    // Prepend the folder prefix to the filename from the query parameter
    const fullImageIdentifier = `${R2_FOLDER_PREFIX}${shareImageFileNameOnly}`;
    dynamicImageUrl = `${base}${fullImageIdentifier}`;
    console.log(`Using dynamic image for frame: ${dynamicImageUrl}`);
  } else if (shareImageFileNameOnly && !r2PublicUrl) {
    console.warn("R2_PUBLIC_URL is not set, cannot use dynamic image for fc:frame.");
  }

  return {
    title: 'My Page',
    description: 'Description of my page',
    other: {
      'fc:frame': JSON.stringify({
        version: "next", // Exactly as requested
        imageUrl: dynamicImageUrl, // Dynamically set image URL
        button: {
          title: "Try now!", // Exactly as requested
          action: {
            type: "launch_frame", // Exactly as requested
            name: "your-frame-name", // Placeholder - PLEASE UPDATE THIS
            url: appUrl, // Uses the defined appUrl (NEXT_PUBLIC_APP_URL or default)
            splashImageUrl: "https://placehold.co/200x200/blue/white/png?text=Splash+Image", // Placeholder - PLEASE UPDATE
            splashBackgroundColor: "#ffffff" // Placeholder - PLEASE UPDATE
          }
        }
      })
    },
    openGraph: {
      title: 'My Page - Check out my result!',
      description: 'I found out my result, check it out!',
      images: [
        {
          url: dynamicImageUrl, // OG image also uses the dynamic image
          width: 600,
          height: 400,
          alt: 'My result image',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'My Page - Check out my result!',
      description: 'I found out my result, check it out!',
      images: [dynamicImageUrl], // Twitter image also uses the dynamic image
    },
  };
}

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <HomeComponent />
      </main>
    </div>
  );
}
