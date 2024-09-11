export default function Tooltip({ message, children }) {
  return (
    <div className="group relative flex max-w-max flex-col items-center justify-center">
      {children}
      <div className="absolute -left-[270%] -top-[60%] ml-auto mr-auto min-w-max -translate-x-1/2 scale-90 opacity-0 transform rounded-lg px-3 py-2 text-xs font-medium transition-all duration-100 group-hover:opacity-100 group-hover:scale-100">
        <div className="flex max-w-xs flex-col items-center shadow-lg">
          <div className="rounded bg-zinc-800 p-2 text-center text-xs text-white">
            {message}
          </div>
        </div>
      </div>
    </div>
  );
}
