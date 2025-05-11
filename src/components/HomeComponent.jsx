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

  useEffect(() => {
    let foundFid = null;

    if (typeof window !== 'undefined' && window.userFid) {
      console.log('Found frame FID:', window.userFid);
      foundFid = window.userFid;
    }

    if (!foundFid && typeof window !== 'undefined') {
      foundFid = '4407';
      console.log('Using hardcoded fallback FID:', foundFid);
    }

    if (foundFid) {
      setFid(foundFid);
      setIsLoading(false);
    } else {
      let attempts = 0;
      const maxAttempts = 30;
      const intervalMs = 200;
      console.log('Polling for FID...');
      const intervalId = setInterval(() => {
        attempts++;
        if (window?.userFid) {
          console.log(`Found FID after polling: ${window.userFid}`);
          setFid(window.userFid);
          setIsLoading(false);
          clearInterval(intervalId);
        } else if (attempts >= maxAttempts) {
          console.warn('FID not found after polling. Showing fallback error.');
          setError("No FID found. Make sure you’re using a supported browser or link.");
          setIsLoading(false);
          clearInterval(intervalId);
        }
      }, intervalMs);

      return () => clearInterval(intervalId);
    }
  }, []);

  useEffect(() => {
    if (!fid) return;

    console.log(`Fetching data for FID: ${fid}`);
    setIsLoading(true);
    setError(null);
    setUserData(null);
    setHogwartsData(null);
    setShareStatus('');

    fetch(`/api/user?fid=${fid}`)
      .then(async res => {
        if (!res.ok) {
          let errorMsg = `API request failed with status ${res.status}`;
          try {
            const errorData = await res.json();
            errorMsg = errorData.error || errorMsg;
          } catch (e) {}
          throw new Error(errorMsg);
        }
        return res.json();
      })
      .then(data => {
        console.log("Received analysis data:", data);
        if (!data.hogwarts) throw new Error("Missing Hogwarts analysis.");
        setUserData({ username: data.username, pfp_url: data.pfp_url, display_name: data.display_name });
        setHogwartsData(data.hogwarts);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error fetching data:", err);
        setError(err.message || "Failed to fetch analysis data.");
        setIsLoading(false);
      });
  }, [fid]);

  const handleShareClick = useCallback(async () => {
    if (!hogwartsData || !fid) return;

    const shareTitle = `What Hogwarts House is ${userData?.display_name || userData?.username || `FID ${fid}`}?`;
    const shareText = `According to the Sorting Hat, ${userData?.display_name || `FID ${fid}`} is most likely a ${hogwartsData.primaryHouse}!`;
    const shareUrl = `${window.location.origin}${window.location.pathname}?fid=${fid}`;

    setShareStatus('Sharing...');

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        setShareStatus('Shared!');
      } catch (error) {
        console.error('Share failed:', error);
        setShareStatus(error.name !== 'AbortError' ? 'Failed to share' : '');
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        setShareStatus('Link Copied!');
      } catch (error) {
        console.error('Copy failed:', error);
        setShareStatus('Failed to copy link');
      }
    }
    setTimeout(() => setShareStatus(''), 3000);
  }, [hogwartsData, userData, fid]);

  const primaryHouse = hogwartsData?.primaryHouse;
  const houseStyle = getHouseStyle(primaryHouse);
  const otherHouses = hogwartsData?.counterArguments ? Object.keys(hogwartsData.counterArguments) : [];

  if (!fid || isLoading) {
    return (
      <div className={`${styles.container} ${styles.loadingContainer}`}>
        <div className={styles.imageWrapper}>
          <Image
            src="/hat.gif"
            alt="Talking sorting hat"
            fill
            priority
            className={styles.headerImage}
          />
        </div>
        <p className={styles.loadingText}>
          {!fid ? "Waiting for frame context..." : "Consulting the Sorting Hat..."}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h2 className={styles.errorTitle}>Sorting Hat Malfunction!</h2>
        <p className={styles.errorMessage}>{error}</p>
      </div>
    );
  }

  return (
    <>

      <div className={styles.container}>
        <div className={styles.headerContainer}>
          {userData && userData.pfp_url && (
            <div className={styles.pfpContainerSmall}>
              <Image
                src={userData.pfp_url}
                alt={`${userData.display_name || userData.username || 'User'}'s profile picture`}
                width={50}
                height={50}
                className={`${styles.pfpImageSmall} ${houseStyle}`}
                priority
                unoptimized
              />
            </div>
          )}
          <h1 className={styles.titleSmall}>
            Sorting complete for <span className={styles.userNameHighlight}>
              {userData?.display_name || userData?.username || `FID ${fid}`}
            </span>!
          </h1>
        </div>

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

        {hogwartsData && (
          <div className={styles.resultsContainer}>
            <h2 className={styles.resultTitle}>
              The Sorting Hat says... <span className={`${styles.highlight} ${houseStyle}`}>{primaryHouse}!</span>
            </h2>
            {hogwartsData.summary && <p className={styles.summary}>{hogwartsData.summary}</p>}

            <div className={styles.detailsGrid}>
              {hogwartsData.evidence?.length > 0 && (
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
    </>
  );
}
