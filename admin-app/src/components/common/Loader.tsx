const Loader = () => {
  const rotations = [36, 72, 108, 144, 180, 216, 252, 288, 324, 360];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-9 h-9">
        {rotations.map((rotation, index) => (
          <div
            key={index}
            className="absolute w-[50%] h-[150%] bg-primary left-[25%] top-0 animate-spinner-pulse"
            style={{
              transform: `rotate(${rotation}deg) translateY(18px)`,
              animationDelay: `${index * 0.1}s`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes spinner-pulse {
          0%, 100% {
            transform: rotate(var(--rotation, 0deg)) translateY(18px) scale(1);
            opacity: 1;
          }
          50% {
            transform: rotate(var(--rotation, 0deg)) translateY(27px) scale(1.2);
            opacity: 0.8;
          }
        }
        .animate-spinner-pulse {
          animation: spinner-pulse 2.5s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Loader;
