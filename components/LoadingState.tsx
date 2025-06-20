import React from "react";
import styles from "../styles/LoadingState.module.css";

interface LoadingStateProps {
  type?: "skeleton" | "spinner" | "progress";
  progress?: number;
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  type = "spinner",
  progress,
  message,
}) => {
  switch (type) {
    case "skeleton":
      return <SkeletonLoader />;
    case "progress":
      return <ProgressBar progress={progress || 0} />;
    default:
      return <Spinner message={message} />;
  }
};

const SkeletonLoader: React.FC = () => {
  return (
    <div className={styles.skeletonContainer}>
      <div className={styles.skeletonHeader} />
      <div className={styles.skeletonContent}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.skeletonItem} />
        ))}
      </div>
    </div>
  );
};

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className={styles.progressText}>{progress}%</span>
    </div>
  );
};

const Spinner: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <div className={styles.spinnerContainer}>
      <div className={styles.spinner} />
      {message && <p className={styles.spinnerMessage}>{message}</p>}
    </div>
  );
};

export default LoadingState;
