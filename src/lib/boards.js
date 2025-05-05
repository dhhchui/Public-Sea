import {
  Newspaper,
  Cpu,
  CalendarDays,
  Piano,
} from "lucide-react";

export const navMain = [
  {
    title: "新聞",
    //url: "/boards/current-affairs",
    icon: Newspaper,
    isActive: true,
    items: [
      { title: "時事台", url: "/boards/current-affairs", slug: "current-affairs" },
      { title: "財經台", url: "/boards/finance", slug: "finance" },
      { title: "娛樂台", url: "/boards/entertainment", slug: "entertainment" },
      { title: "房屋台", url: "/boards/housing", slug: "housing" },
    ],
  },
  {
    title: "科技",
    //url: "/boards/mobile",
    icon: Cpu,
    items: [
      { title: "手機台", url: "/boards/mobile", slug: "mobile" },
      { title: "電器台", url: "/boards/appliances", slug: "appliances" },
      { title: "硬件台", url: "/boards/hardware", slug: "hardware" },
      { title: "軟件台", url: "/boards/software", slug: "software" },
    ],
  },
  {
    title: "生活",
    //url: "/boards/creativity",
    icon: CalendarDays,
    items: [
      { title: "創意台", url: "/boards/creativity", slug: "creativity" },
      { title: "感情台", url: "/boards/relationships", slug: "relationships" },
      { title: "飲食台", url: "/boards/food", slug: "food" },
      { title: "上班台", url: "/boards/work", slug: "work" },
      { title: "旅遊台", url: "/boards/travel", slug: "travel" },
      { title: "校園台", url: "/boards/campus", slug: "campus" },
    ],
  },
  {
    title: "興趣",
    //url: "/boards/sports",
    icon: Piano,
    items: [
      { title: "體育台", url: "/boards/sports", slug: "sports" },
      { title: "學術台", url: "/boards/academics", slug: "academics" },
      { title: "遊戲台", url: "/boards/gaming", slug: "gaming" },
      { title: "影視台", url: "/boards/movies", slug: "movies" },
      { title: "動漫台", url: "/boards/anime", slug: "anime" },
      { title: "音樂台", url: "/boards/music", slug: "music" },
    ],
  },
];