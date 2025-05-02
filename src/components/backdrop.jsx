export function Backdrop({ onClick }) {
    return (
        <div className="fixed top-0 left-0 w-full h-full bg-[rgba(0,0,0,0.5)] z-[1000]" onClick={onClick}>
        </div>
    )
}