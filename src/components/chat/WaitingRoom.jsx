import { Loader2, Users } from "lucide-react";

const WaitingRoom = () => {
  return (
    <div className="h-screen bg-base-200 flex items-center justify-center">
      <div className="bg-base-100 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <Users className="absolute inset-0 m-auto size-10 text-primary" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold mb-2">Finding a Match</h2>
        <p className="text-base-content/70 mb-4">
          We're looking for someone to chat with you...
        </p>
        
        <div className="flex items-center justify-center gap-2 text-sm text-base-content/50">
          <Loader2 className="size-4 animate-spin" />
          <span>This may take a few moments</span>
        </div>
      </div>
    </div>
  );
};

export default WaitingRoom;
