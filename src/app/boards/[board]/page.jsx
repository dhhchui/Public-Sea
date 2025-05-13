import { notFound } from 'next/navigation';
import BoardContent from '@/components/BoardContent';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Textarea } from '@/components/ui/textarea';
import { FilePlus } from 'lucide-react';

const categoryMap = {
  吹水台: '其他',
  管理台: '其他',
  學術台: '興趣',
  時事台: '新聞',
  財經台: '新聞',
  手機台: '科技',
  電腦台: '科技',
  飲食台: '生活',
  上班台: '生活',
  旅遊台: '生活',
  校園台: '生活',
  感情台: '生活',
  體育台: '興趣',
  遊戲台: '興趣',
  影視台: '興趣',
  音樂台: '興趣',
};

export async function generateStaticParams() {
  try {
    const res = await fetch('http://localhost:3000/api/boards', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 86400 }, // 快取 24 小時
    });

    if (!res.ok) {
      console.error('Failed to fetch boards for static params:', res.status);
      return [];
    }

    const data = await res.json();
    const boards = data.boards || [];

    return boards.map((board) => ({
      board: encodeURIComponent(board.name), // 編碼中文名稱
    }));
  } catch (error) {
    console.error('Error in generateStaticParams:', error);
    return [];
  }
}

export default async function BoardPage({ params, searchParams }) {
  // 使用 await 解構 params
  const { board } = await params;
  const decodedBoard = decodeURIComponent(board); // 解碼 URL 中的中文名稱

  try {
    const res = await fetch('http://localhost:3000/api/boards', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 86400 }, // 快取 24 小時
    });

    if (!res.ok) {
      console.error('Failed to fetch boards:', res.status);
      notFound();
    }

    const data = await res.json();
    const boards = data.boards || [];

    const boardData = boards.find((item) => item.name === decodedBoard);

    if (!boardData) {
      console.log(`Board not found: ${decodedBoard}`);
      notFound();
    }

    const categoryTitle = categoryMap[boardData.name] || '其他';

    return (
      <>
        <div className='sticky top-0 bg-background'>
          <header className='flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
            <div className='flex w-full items-center gap-2 px-4'>
              <SidebarTrigger className='-ml-1' />
              <Separator
                orientation='vertical'
                className='mr-2 data-[orientation=vertical]:h-4'
              />
              <Breadcrumb className='w-full'>
                <BreadcrumbList>
                  {/* <BreadcrumbItem className='hidden md:block'>
                    <BreadcrumbLink href={`/boards/${board}`}>
                      {decodeURIComponent(board)}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className='hidden md:block' /> */}
                  <BreadcrumbItem>
                    <BreadcrumbPage>{boardData.name}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <FilePlus />
                    新增留言
                  </Button>
                </DialogTrigger>
                <DialogContent className='flex flex-col sm:max-w-[425px] max-h-[96vh]'>
                  <DialogHeader>
                    <DialogTitle>新增留言</DialogTitle>
                    {/* <DialogDescription>
                  Make changes to your profile here. Click save when you're
                  done.
                  </DialogDescription> */}
                  </DialogHeader>
                  <form
                    // onSubmit={handleCommentSubmit}
                    className='flex flex-col gap-4'
                  >
                    <div className='flex-1 overflow-auto'>
                      <Textarea
                        // value={commentContent}
                        // onChange={(e) => setCommentContent(e.target.value)}
                        placeholder='撰寫您的留言...'
                        className='resize-none'
                        required
                        // disabled={isSubmitting}
                      />
                    </div>
                    {/* <DialogFooter> */}
                    <Button
                      className='self-start'
                      type='submit'
                      // disabled={isSubmitting}
                    >
                      {/* {isSubmitting ? (
                        <>
                          <Loader2 className='animate-spin' /> 提交中
                        </>
                      ) : (
                        <>
                          <SendHorizontal /> 提交留言
                        </>
                      )} */}
                    </Button>
                    {/* </DialogFooter> */}
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </header>
          <Separator />
        </div>
        <main className='flex flex-col gap-4 p-4'>
          <div className='w-1/2 flex flex-col gap-2'>
            <div>
              <h1 className='text-3xl font-bold'>{boardData.name}</h1>
              <p className='text-gray-600 mt-1'>
                歡迎來到 {categoryTitle} - {boardData.name}！
              </p>
            </div>
            <BoardContent board={decodedBoard} boardData={boardData} />
          </div>
          {/* <div className='w-1/2 flex items-center justify-center text-gray-500'>
            請選擇一個話題查看詳情
          </div> */}
        </main>
      </>
    );
  } catch (error) {
    console.error('Error in BoardPage:', error);
    notFound();
  }
}
