import React, { useState, useEffect } from 'react';

interface Props {
  targetDate: string;
  labels: { days: string; hours: string; mins: string; secs: string };
}

const Countdown: React.FC<Props> = ({ targetDate, labels }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!targetDate) return;
      
      const target = new Date(targetDate);
      if (isNaN(target.getTime())) return;

      const difference = target.getTime() - new Date().getTime();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        // Date passed
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex justify-center gap-4 md:gap-8 my-8 text-wedding-text">
      {[
        { val: timeLeft.days, label: labels.days },
        { val: timeLeft.hours, label: labels.hours },
        { val: timeLeft.minutes, label: labels.mins },
        { val: timeLeft.seconds, label: labels.secs },
      ].map((item, idx) => (
        <div key={idx} className="flex flex-col items-center">
          <span className="text-2xl md:text-4xl font-serif font-light">{String(item.val).padStart(2, '0')}</span>
          <span className="text-xs uppercase tracking-widest opacity-60 mt-1">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export default Countdown;