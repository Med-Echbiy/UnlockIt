function GlassBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className='bg-white/10 backdrop-blur-md rounded-lg p-4'>
      {children}
    </div>
  );
}
export default GlassBackground;
