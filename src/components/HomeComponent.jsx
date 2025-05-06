'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './HomeComponent.module.css';

// Helper function to get house colors (adjust as needed)
const getHouseStyle = (houseName) => {
  switch (houseName?.toLowerCase()) {
    case 'gryffindor': return styles.gryffindor;
    case 'slytherin': return styles.slytherin;
    case 'hufflepuff': return styles.hufflepuff;
    case 'ravenclaw': return styles.ravenclaw;
    default: return '';
  }
};

export function HomeComponent() {
  const [userData, setUserData] = useState(null);
  const [hogwartsData, setHogwartsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fid, setFid] = useState(null);
  const [shareStatus, setShareStatus] = useState('');

  // Effect to check for window.userFid
  useEffect(() => {
    // Check immediately in case it's already set
    if (typeof window !== 'undefined' && window.userFid) {
      console.log('HomeComponent found window.userFid immediately:', window.userFid);
      setFid(window.userFid);
      setIsLoading(false); // Stop initial loading check
      return; // Exit effect early
    }

    // If not found immediately, poll for it
    let attempts = 0;
    const maxAttempts = 30; // e.g., 30 * 200ms = 6 seconds
    const intervalMs = 200;
    console.log('HomeComponent starting poll for window.userFid');
    const intervalId = setInterval(() => {
      attempts++;
      if (typeof window !== 'undefined' && window.userFid) {
        console.log(`HomeComponent found window.userFid after ${attempts} attempts:`, window.userFid);
        setFid(window.userFid);
        setIsLoading(false); // Can likely remove this if fetch effect handles loading
        clearInterval(intervalId);
      } else if (attempts >= maxAttempts) {
        console.warn('HomeComponent polling timeout reached without finding window.userFid.');
        setError("Could not detect Farcaster frame context. Ensure you're viewing this in a frame.");
        setIsLoading(false);
        clearInterval(intervalId);
      }
    }, intervalMs);

    // Cleanup interval on component unmount
    return () => {
      console.log("HomeComponent cleaning up polling interval.");
      clearInterval(intervalId);
    };
  }, []); // Run only once on mount

  // Fetch data effect (triggered by fid change)
  useEffect(() => {
    if (!fid) {
        return; // Do nothing if FID is null
    }

    console.log(`HomeComponent FID set to: ${fid}, fetching analysis data...`);
    setIsLoading(true);
    setError(null);
    setUserData(null);
    setHogwartsData(null);
    setShareStatus('');

    fetch(`/api/user?fid=${fid}`)
      .then(async res => {
        if (!res.ok) {
          let errorMsg = `API request failed with status ${res.status}`;
          try { const errorData = await res.json(); errorMsg = errorData.error || errorMsg; } catch (e) { /* Ignore */ }
          throw new Error(errorMsg);
        }
        return res.json();
      })
      .then(data => {
        console.log("HomeComponent received analysis data:", data);
        if (!data.hogwarts) throw new Error("Missing Hogwarts analysis.");
        setUserData({ username: data.username, pfp_url: data.pfp_url, display_name: data.display_name });
        setHogwartsData(data.hogwarts);
        setIsLoading(false); // Data loaded
      })
      .catch(err => {
        console.error("Error fetching analysis data:", err);
        setError(err.message || "Failed to fetch analysis data.");
        setIsLoading(false); // Error occurred
      });
  }, [fid]);

  const handleShareClick = useCallback(async () => {
    if (!hogwartsData || !fid) return;

    const shareTitle = `What Hogwarts House is ${userData?.display_name || userData?.username || `FID ${fid}` }?`;
    const shareText = `According to the Sorting Hat, ${userData?.display_name || `FID ${fid}` } is most likely a ${hogwartsData.primaryHouse}! Find out your Farcaster Hogwarts House:`;
    const shareUrl = `${window.location.origin}${window.location.pathname}?fid=${fid}`;

    setShareStatus('Sharing...');

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        console.log('Shared successfully via Web Share API');
        setShareStatus('Shared!');
      } catch (error) {
        console.error('Error sharing via Web Share API:', error);
        if (error.name !== 'AbortError') {
            setShareStatus('Failed to share');
        } else {
            setShareStatus('');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        console.log('Link copied to clipboard');
        setShareStatus('Link Copied!');
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        setShareStatus('Failed to copy link');
      }
    }
    setTimeout(() => setShareStatus(''), 3000);
  }, [hogwartsData, userData, fid]);

  const primaryHouse = hogwartsData?.primaryHouse;
  const houseStyle = getHouseStyle(primaryHouse);
  const otherHouses = hogwartsData?.counterArguments ? Object.keys(hogwartsData.counterArguments) : [];

  // Loading State UI (Show if fid is not set yet OR if isLoading is true during fetch)
  if (!fid || isLoading) {
        return (
            <div className={`${styles.container} ${styles.loadingContainer}`}>
                <div className={styles.spinner}></div>
                {/* Adjust text based on whether we are waiting for FID or fetching data */} 
                <p className={styles.loadingText}>{!fid ? "Waiting for frame context..." : "Consulting the Sorting Hat..."}</p>
            </div>
        );
  }

  // Error State UI
  if (error) {
        return (
            <div className={styles.container}>
                 <h2 className={styles.errorTitle}>Sorting Hat Malfunction!</h2>
                <p className={styles.errorMessage}>{error}</p>
            </div>
        );
  }

  // Main Content UI (Only render if fid is set, not loading, and no error)
  return (
    <div className={styles.container}>
      {/* Simplified Header */} 
      <div className={styles.headerContainer}>
        {userData && userData.pfp_url && (
            <div className={styles.pfpContainerSmall}>
              <Image
                src={userData.pfp_url}
                alt={`${userData.display_name || userData.username || 'User'}'s profile picture`}
                width={50} // Smaller PFP
                height={50}
                className={`${styles.pfpImageSmall} ${houseStyle}`}
                priority
                unoptimized={true}
              />
            </div>
        )}
         <h1 className={styles.titleSmall}>
            Sorting complete for <span className={styles.userNameHighlight}>{userData?.display_name || userData?.username || `FID ${fid}` }</span>!
        </h1>
      </div>

      {/* Share Button - MOVED HERE */} 
      {hogwartsData && (
        <button
            className={styles.shareButton}
            onClick={handleShareClick}
            disabled={!!shareStatus && shareStatus !== 'Share Result'}
            aria-label="Share Result"
        >
            <span role="img" aria-label="share icon">🔗</span> 
            {shareStatus || 'Share Result'}
        </button>
       )}

      {/* Results Container */} 
      {hogwartsData && (
          <div className={styles.resultsContainer}>
            <h2 className={styles.resultTitle}>The Sorting Hat says... <span className={`${styles.highlight} ${houseStyle}`}>{primaryHouse}!</span></h2>
            {hogwartsData.summary && <p className={styles.summary}>{hogwartsData.summary}</p>}
            
            {/* Details Grid - REORDERED */} 
            <div className={styles.detailsGrid}>
                {/* Key Traits & Evidence (Now First) */} 
                {hogwartsData.evidence && hogwartsData.evidence.length > 0 && (
                  <div className={styles.evidenceContainer}>
                    <h3>Key Traits & Evidence</h3>
                    {hogwartsData.evidence.map((item, index) => (
                      <div key={index} className={styles.evidenceItem}>
                        <h4 className={styles.traitTitle}>{item.trait}</h4>
                        <blockquote>
                          {item.quotes.map((quote, qIndex) => (
                            <p key={qIndex}>"{quote}"</p>
                          ))}
                        </blockquote>
                        <p className={styles.explanation}>{item.explanation}</p>
                      </div>
                    ))}
                  </div>
                )}
                {/* House Affinity (Now Second) */} 
                {hogwartsData.housePercentages && (
                  <div className={styles.percentagesContainer}>
                    <h3>House Affinity</h3>
                    <ul>
                      {Object.entries(hogwartsData.housePercentages)
                        .sort(([, a], [, b]) => b - a)
                        .map(([house, percentage]) => (
                          <li key={house} className={getHouseStyle(house)}>
                             {house}: {Math.round(percentage)}%
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
            </div>

             {/* Why Not Section */} 
             {otherHouses.length > 0 && (
                <div className={styles.whyNotContainer}>
                    <h3>Why Not Other Houses?</h3>
                    {otherHouses.map(house => (
                        <div key={house} className={styles.whyNotItem}>
                            <strong className={getHouseStyle(house)}>{house}:</strong> {hogwartsData.counterArguments[house]}
                        </div>
                    ))}
                </div>
             )}
          </div>
      )}
    </div>
  );
} 