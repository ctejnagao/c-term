'use client';

import { useState, useEffect, use } from 'react';
import { format } from 'date-fns';
import Image from 'next/image';

export default function PrintPage({ params }: { params: Promise<{ type: string, id: string }> }) {
  const resolvedParams = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiRoute = resolvedParams.type === 'estimate' ? '/api/estimates' 
                   : resolvedParams.type === 'delivery' ? '/api/deliveries'
                   : resolvedParams.type === 'order_accept' ? '/api/order-acceptances'
                   : resolvedParams.type === 'invoice' ? '/api/invoices' : null;
    if (apiRoute) {
      fetch(apiRoute).then(res => res.json()).then(list => {
        const item = list.find((i: any) => i.id === Number(resolvedParams.id));
        setData(item);
        setLoading(false);
      });
    }
  }, [params]);

  if (loading) return <div className="p-8 print:hidden">Loading...</div>;
  if (!data) return <div className="p-8 print:hidden">Data not found</div>;

  const isEstimate = resolvedParams.type === 'estimate';
  const isDelivery = resolvedParams.type === 'delivery';
  const isOrderAccept = resolvedParams.type === 'order_accept';
  
  const title = isEstimate ? '見　積　書'
              : isDelivery ? '納　品　書'
              : isOrderAccept ? '注　文　請　書'
              : resolvedParams.type === 'invoice' ? '請　求　書' : '';
  
  const docNoLabel = isEstimate ? '見積NO.'
                   : isDelivery ? '納品NO.'
                   : isOrderAccept ? '請書NO.'
                   : '請求NO.';

  const docNo = isEstimate ? data.estimateNo
              : isDelivery ? data.deliveryNo
              : isOrderAccept ? data.acceptanceNo
              : resolvedParams.type === 'invoice' ? data.invoiceNo : '';

  const dateValue = isEstimate ? data.issueDate
                  : isDelivery ? data.deliveryDate
                  : isOrderAccept ? data.acceptDate
                  : resolvedParams.type === 'invoice' ? data.issueDate : '';

  // 画像は後で差し替えられるようにプレースホルダーを配置
  const logoUrl = '/logo_print.png'; // 印刷用（旧）ロゴ
  const sealUrl = '/seal.png'; // 実際には public/seal.png に配置

  return (
    <div className="bg-gray-100 min-h-screen p-8 print:p-0 print:bg-white font-sans text-black">
      <div className="mb-4 print:hidden text-center">
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700">
          このページを印刷する
        </button>
      </div>

      <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white shadow-lg print:shadow-none print:m-0 print:p-0 box-border relative text-[13px]">
        {/* Top Header */}
        <div className="h-6 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-200 text-right pr-4 text-white italic font-serif flex items-center justify-end text-sm mb-4">
          Com-tech Enterprise, Japan Ltd.
        </div>

        <div className="px-12 pb-12">
          {/* Title */}
          <div className="text-3xl font-bold tracking-[1em] mb-4 border-b-2 border-blue-600 pb-1 italic font-serif">
            {title}
          </div>

          {/* Date and No */}
          <div className="text-right mb-6">
            <div className="inline-block text-right">
              <p>{format(new Date(dateValue), 'yyyy 年 M 月 d 日')}</p>
              <div className="flex justify-between border-b border-black mt-1">
                <span className="mr-4">{docNoLabel}</span>
                <span>{docNo}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between mb-8">
            <div className="w-1/2">
              <h2 className="text-xl font-bold border-b border-black mb-2 pb-1 flex justify-between items-end">
                <span>{data.partner?.name}</span>
                <span className="text-lg">御中</span>
              </h2>
              {data.partner?.postalCode && (
                <div className="text-sm">〒{data.partner.postalCode}</div>
              )}
              {data.partner?.address && (
                <div className="text-sm mb-2">{data.partner.address}</div>
              )}
              {(data.project?.customerDepartment || data.project?.customerStaff) && (
                <div className="mb-2 text-base font-bold">
                  {data.project?.customerDepartment && <div>{data.project.customerDepartment}</div>}
                  {data.project?.customerStaff && <div>{data.project.customerStaff} 様</div>}
                </div>
              )}
              <p className="mt-4 mb-2">
                {isDelivery ? '下記の通り納品致しましたのでご査収下さい。'
                 : isOrderAccept ? '下記の通りご注文をお受けいたしました。'
                 : resolvedParams.type === 'invoice' ? '下記の通り請求申し上げます。'
                 : '下記の通り見積り申し上げます。'}
              </p>
              
              <div className="flex mb-4">
                <span className="w-16 font-bold tracking-widest">件名</span>
                <span className="flex-1 border-b border-black pl-2">{data.project?.name}</span>
              </div>

              {isDelivery && (
                <div className="mt-2 w-3/4">
                  <div className="flex mb-1">
                    <span className="w-20 tracking-widest text-sm">納 品 日</span>
                    <span className="flex-1 border-b border-black text-center">{format(new Date(data.deliveryDate), 'yyyy/M/d')}</span>
                  </div>
                  <div className="flex">
                    <span className="w-20 tracking-widest text-sm">購 買 №</span>
                    <span className="flex-1 border-b border-black text-center">{data.project?.clientOrderNo || ''}</span>
                  </div>
                </div>
              )}

              {isEstimate && (
                <div className="w-4/5 grid grid-cols-[100px_1fr] gap-y-2 mt-4">
                  <div className="tracking-widest">納　　　期</div>
                  <div className="border-b border-black text-center">別 途 御 相 談</div>
                  <div className="tracking-widest">作 業 期 間</div>
                  <div className="border-b border-black text-center">〜</div>
                  <div className="tracking-widest">見積有効期限</div>
                  <div className="border-b border-black text-center">{data.validUntil}</div>
                  <div className="tracking-widest">御 支 払 条 件</div>
                  <div className="border-b border-black text-center">{data.paymentTerm}</div>
                </div>
              )}
            </div>

            <div className="w-2/5 relative">
              <div className="flex gap-2">
                {/* Logo */}
                <div className="w-8 h-8 shrink-0 relative mt-1">
                  <Image src={logoUrl} alt="Logo" fill className="object-contain" unoptimized />
                </div>
                <div className="leading-tight">
                  <p className="whitespace-nowrap font-bold">株式会社 コムテックエンタープライズ</p>
                  <p className="text-[11px] mt-1">名古屋市中区丸の内二丁目10番30号</p>
                  <p className="text-[11px]">インテリジェント林ビル４Ｆ</p>
                  <p className="text-[11px] mt-1">TEL: 052-222-8077 / FAX: 052-222-8078</p>
                  <p className="text-[10px] mt-1 text-gray-700">登録番号: T1180001047113</p>
                </div>
              </div>
              
              {/* Seal */}
              <div className="absolute top-2 right-2 w-16 h-16 opacity-90">
                <Image src={sealUrl} alt="Seal" fill className="object-contain" unoptimized />
              </div>

              <div className="flex items-center gap-4 mt-8 ml-8">
                <span className="tracking-widest">担当者</span>
                <span className="border-b border-black flex-1 text-center">{data.project?.leadStaff || '（担当者未設定）'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-end mb-4">
            <div className="flex border-2 border-black w-3/5">
              <div className="bg-blue-100 font-bold px-4 py-2 border-r-2 border-black tracking-widest flex items-center justify-center">
                合計金額
              </div>
              <div className="flex-1 text-2xl font-bold px-4 py-2 text-center flex items-center justify-center">
                ¥{Number(isEstimate ? data.subtotal : data.totalAmount).toLocaleString()} －
              </div>
            </div>
            <div className="ml-2 pb-2">
              {isEstimate ? '(税抜金額)' : '(税込金額)'}
            </div>
          </div>

          <table className="w-full text-left border-collapse border-2 border-black">
            <thead>
              <tr className="border-b-2 border-black bg-blue-50">
                <th className="border-r border-black p-2 w-10 text-center font-normal">No.</th>
                <th className="border-r border-black p-2 text-center font-normal">{resolvedParams.type === 'invoice' ? '品名・摘要' : '項目'}</th>
                <th className="border-r border-black p-2 w-20 text-center font-normal">数量</th>
                <th className="border-r border-black p-2 w-24 text-center font-normal">単価</th>
                <th className="border-r border-black p-2 w-32 text-center font-normal">金額</th>
                <th className="p-2 w-24 text-center font-normal">{isDelivery ? '購買№' : '備考'}</th>
              </tr>
            </thead>
            <tbody>
              {data.items?.map((item: any, index: number) => (
                <tr key={index} className="border-b border-black h-12">
                  <td className="border-r border-black p-2 text-center">{index + 1}.</td>
                  <td className="border-r border-black p-2">{item.itemName}</td>
                  <td className="border-r border-black p-2 text-center">{Number(item.quantity).toFixed(1)} <span className="ml-1">{item.unit}</span></td>
                  <td className="border-r border-black p-2 text-right">{Number(item.unitPrice).toLocaleString()}</td>
                  <td className="border-r border-black p-2 text-right">{Number(item.amount || (item.quantity * item.unitPrice)).toLocaleString()}</td>
                  <td className="p-2 text-xs text-center break-words">{isDelivery ? data.project?.clientOrderNo : ''}</td>
                </tr>
              ))}
              {/* Fill empty rows to make it look like excel (approx 10 rows total) */}
              {Array.from({ length: Math.max(0, 10 - (data.items?.length || 0)) }).map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-black h-12">
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td></td>
                </tr>
              ))}
              <tr className="border-t-2 border-black bg-blue-50">
                <td colSpan={4} className="border-r border-black p-2 text-center font-bold tracking-widest">合　計</td>
                <td className="border-r border-black p-2 text-right">{Number(data.subtotal).toLocaleString()}</td>
                <td rowSpan={(!isEstimate) ? 3 : 1}></td>
              </tr>
              {!isEstimate && (
                <>
                  <tr className="border-t border-black bg-blue-50">
                    <td colSpan={4} className="border-r border-black p-2 text-center font-bold tracking-widest">消費税(10%)</td>
                    <td className="border-r border-black p-2 text-right">{Number(data.tax).toLocaleString()}</td>
                  </tr>
                  <tr className="border-t border-black bg-blue-50">
                    <td colSpan={4} className="border-r border-black p-2 text-center font-bold tracking-widest">総合計</td>
                    <td className="border-r border-black p-2 text-right font-bold">{Number(data.totalAmount).toLocaleString()}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          {isEstimate && (
            <div className="mt-2 text-xs">
              <p>＊備考＊</p>
              <p className="ml-4">・表示金額に消費税は含まれておりません。</p>
            </div>
          )}

          {resolvedParams.type === 'invoice' && (
            <div className="mt-8 flex justify-end">
              <div className="border-2 border-black flex w-[420px] text-sm">
                <div className="bg-[#dcf4ce] px-4 py-6 flex items-center justify-center border-r-2 border-black font-bold whitespace-nowrap">
                  お振込先
                </div>
                <div className="p-4 flex-1">
                  <div className="text-center mb-2 tracking-widest">三菱ＵＦＪ銀行　大津町支店</div>
                  <div className="flex justify-center gap-8 mb-2">
                    <span>普通</span>
                    <span>口座番号：3925828</span>
                  </div>
                  <div className="text-center text-[13px]">㈱コムテックエンタープライズ</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
