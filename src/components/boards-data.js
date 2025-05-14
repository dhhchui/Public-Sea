/* import {
  CalendarDays,
  Cpu,
  Piano,
  Newspaper,
  UserRound,
  UsersRound,
} from "lucide-react";

export const data = {
  navMain: [
    {
      title: "新聞",
      url: "#",
      icon: Newspaper,
      isActive: true,
      items: [
        { title: "時事台", url: "/boards/時事台" },
        { title: "財經台", url: "/boards/財經台" },
      ],
    },
    {
      title: "科技",
      url: "#",
      icon: Cpu,
      items: [
        { title: "手機台", url: "/boards/手機台" },
        { title: "電腦台", url: "/boards/電腦台" },
      ],
    },
    {
      title: "生活",
      url: "#",
      icon: CalendarDays,
      items: [
        { title: "飲食台", url: "/boards/飲食台" },
        { title: "上班台", url: "/boards/上班台" },
        { title: "旅遊台", url: "/boards/旅遊台" },
        { title: "校園台", url: "/boards/校園台" },
      ],
    },
    {
      title: "興趣",
      url: "#",
      icon: Piano,
      items: [
        { title: "體育台", url: "/boards/體育台" },
        { title: "遊戲台", url: "/boards/遊戲台" },
        { title: "影視台", url: "/boards/影視台" },
        { title: "音樂台", url: "/boards/音樂台" },
      ],
    },
  ],
  chats: [
    { name: "土瓜灣漢堡包", url: "#", icon: UserRound },
    { name: "深水埗糯米雞", url: "#", icon: UserRound },
    { name: "跳舞群組", url: "#", icon: UsersRound },
  ],
};

// 提取所有分台名稱
export const allBoards = data.navMain.flatMap((category) =>
  category.items.map((item) => item.title)
);
 */