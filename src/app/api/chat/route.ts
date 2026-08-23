import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ reply: 'メッセージを入力してください。' });
    }

    // Convert message to keywords (simple split by space)
    const keywords = message.split(/[\s　]+/).filter((k: string) => k.length > 0);

    let foundMemos: any[] = [];

    if (keywords.length > 0) {
      // Search SystemMemo for any keyword
      // For simplicity, we search if the title, content, or tags contain the first keyword
      // In a real LLM + RAG, this would use vector embeddings.
      const query = keywords[0]; // just use the primary keyword for the basic mock
      
      foundMemos = await prisma.systemMemo.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
            { tags: { contains: query, mode: 'insensitive' } },
          ]
        },
        take: 3
      });
    }

    let reply = '';

    if (foundMemos.length > 0) {
      reply = `「${keywords[0]}」に関する情報が見つかりました。\n\n`;
      foundMemos.forEach((memo, index) => {
        reply += `【${memo.title}】 (${memo.category})\n`;
        reply += `${memo.content}\n`;
        if (index < foundMemos.length - 1) reply += `\n---\n\n`;
      });
      reply += `\nご参考になれば幸いです。`;
    } else {
      reply = `すみません、「${message}」に関する備忘録は見つかりませんでした。別のキーワードでお試しください。`;
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 });
  }
}
