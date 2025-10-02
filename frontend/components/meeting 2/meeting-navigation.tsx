"use client";

import { cn } from "@/lib/utils";
import {
  ChevronsLeft,
  MenuIcon,
  Plus,
  PlusCircle,
  Search,
  Settings,
  Trash,
  Mic,
  Users,
  Calendar,
  PlayCircle,
  Upload,
} from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ElementRef, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "usehooks-ts";
import { UserItem } from "./user-item";
import { Item } from "../../app/(main)/_components/item";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TrashBox } from "./trash-box";
import { useSearch } from "@/hooks/use-search";
import { useSettings } from "@/hooks/use-setting";
import { Navbar } from "./navbar";

// Meeting-specific components
const MeetingList = () => {
  // This will be replaced with actual meeting data
  const meetings = [
    { id: "1", title: "Team Standup", date: "2024-01-15", duration: "15 min" },
    { id: "2", title: "Project Review", date: "2024-01-14", duration: "45 min" },
    { id: "3", title: "Client Call", date: "2024-01-13", duration: "30 min" },
  ];

  const router = useRouter();

  return (
    <div className="space-y-1">
      {meetings.map((meeting) => (
        <div
          key={meeting.id}
          onClick={() => router.push(`/meetings/${meeting.id}`)}
          className="flex items-center p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer group"
        >
          <PlayCircle className="h-4 w-4 mr-2 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{meeting.title}</p>
            <p className="text-xs text-muted-foreground">
              {meeting.date} • {meeting.duration}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export const MeetingNavigation = () => {
  const router = useRouter();
  const settings = useSettings();
  const search = useSearch();
  const params = useParams();
  const pathname = usePathname();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const isResizingRef = useRef(false);
  const sidebarRef = useRef<ElementRef<"aside">>(null);
  const navbarRef = useRef<ElementRef<"div">>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (isMobile) {
      collapse();
    }
  }, [pathname, isMobile]);

  const handleMouseDown = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    isResizingRef.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!isResizingRef.current) return;
    let newWidth = event.clientX;

    if (newWidth < 240) newWidth = 240;
    if (newWidth > 480) newWidth = 480;

    if (sidebarRef.current && navbarRef.current) {
      sidebarRef.current.style.width = `${newWidth}px`;
      navbarRef.current.style.setProperty("left", `${newWidth}px`);
      navbarRef.current.style.setProperty(
        "width",
        `calc(100% - ${newWidth}px)`
      );
    }
  };

  const handleMouseUp = () => {
    isResizingRef.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const resetWidth = () => {
    if (sidebarRef.current && navbarRef.current) {
      setIsCollapsed(false);
      setIsResetting(true);

      sidebarRef.current.style.width = isMobile ? "100%" : "240px";
      navbarRef.current.style.setProperty(
        "width",
        isMobile ? "0" : "calc(100% - 240px)"
      );
      navbarRef.current.style.setProperty("left", isMobile ? "100%" : "240px");
      setTimeout(() => setIsResetting(false), 300);
    }
  };

  const collapse = () => {
    if (sidebarRef.current && navbarRef.current) {
      setIsCollapsed(true);
      setIsResetting(true);

      sidebarRef.current.style.width = "0";
      navbarRef.current.style.setProperty("width", "100%");
      navbarRef.current.style.setProperty("left", "0");
      setTimeout(() => setIsResetting(false), 300);
    }
  };

  const handleStartMeeting = () => {
    router.push("/meetings/new");
    toast.success("Starting new meeting...");
  };

  const handleUploadMeeting = () => {
    router.push("/meetings/upload");
    toast.success("Upload meeting audio...");
  };

  const handleSpeakerSetup = () => {
    router.push("/speakers/setup");
    toast.success("Setting up speakers...");
  };

  return (
    <>
      <aside
        ref={sidebarRef}
        className={cn(
          "group/sidebar h-full bg-secondary overflow-y-auto relative flex w-60 flex-col z-[99999]",
          isResetting && "transition-all ease-in-out duration-300",
          isMobile && "w-0"
        )}
      >
        <div
          onClick={collapse}
          role="button"
          className={cn(
            "h-6 w-6 text-muted-foreground rounded-sm hover:bg-neutral-300 dark:hover:bg-neutral-600 absolute top-3 right-2 opacity-0 group-hover/sidebar:opacity-100 transition",
            isMobile && "opacity-100"
          )}
        >
          <ChevronsLeft className="h-6 w-6" />
        </div>

        <div className="p-3">
          <UserItem />
          <div className="mt-4 space-y-1">
            <Item label="Search" icon={Search} isSearch onClick={search.onOpen} />
            <Item label="Settings" icon={Settings} onClick={settings.onOpen} />
          </div>
        </div>

        {/* Meeting Actions */}
        <div className="px-3">
          <div className="mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Quick Actions
            </p>
          </div>
          <div className="space-y-1">
            <Item 
              onClick={handleStartMeeting} 
              label="Start Meeting" 
              icon={Mic}
            />
            <Item 
              onClick={handleUploadMeeting} 
              label="Upload Audio" 
              icon={Upload}
            />
            <Item 
              onClick={handleSpeakerSetup} 
              label="Setup Speakers" 
              icon={Users}
            />
          </div>
        </div>

        {/* Recent Meetings */}
        <div className="mt-6 flex-1">
          <div className="px-3 mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Meetings
            </p>
            <button
              onClick={() => router.push("/meetings/new")}
              className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <div className="px-3">
            <MeetingList />
          </div>
        </div>

        {/* Trash */}
        <div className="px-3 pb-3">
          <Popover>
            <PopoverTrigger className="w-full">
              <Item label="Trash" icon={Trash} />
            </PopoverTrigger>
            <PopoverContent
              className="p-0 w-72"
              side={isMobile ? "bottom" : "right"}
            >
              <TrashBox />
            </PopoverContent>
          </Popover>
        </div>

        <div
          onMouseDown={handleMouseDown}
          onClick={resetWidth}
          className="opacity-0 group-hover/sidebar:opacity-100 transition cursor-ew-resize absolute h-full w-1 bg-primary right-0 top-0"
        />
      </aside>

      <div
        ref={navbarRef}
        className={cn(
          "absolute top-0 z-[99999] left-60 w-[calc(100%-240px)]",
          isResetting ? "transition-all ease-in-out duration-300" : "",
          isMobile ? "left-0 w-full" : ""
        )}
      >
        {!!params.meetingId ? (
          <Navbar isCollapsed={isCollapsed} onResetWidth={resetWidth} />
        ) : (
          <nav className="bg-transparent px-3 py-2 w-full">
            {isCollapsed && (
              <MenuIcon
                onClick={resetWidth}
                role="button"
                className="h-6 w-6 text-muted-foreground cursor-pointer"
              />
            )}
          </nav>
        )}
      </div>
    </>
  );
};
