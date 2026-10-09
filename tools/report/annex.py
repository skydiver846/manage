# append 붙임 page: heading + timetable
W=[6000,8600,22578,13600]  # sum 50778
rows=[
('1일차',[('1교시','과정 소개 · AI 첫 경험(HTML 계산기·게임) · 프롬프트 5요소','강의 · 실습'),
 ('2교시','파일 건네기 · 프로젝트(폴더)','실습'),
 ('3교시','옵시디언과 MD 파일','실습 (설치 포함)'),
 ('4교시','업무 기획서(PRD) 작성','실습 (내 PRD)'),
 ('5교시','스킬 만들기 · 내 업무 스킬','실습'),
 ('6교시','PRD로 보고 자료 만들기 (슬라이드 · 결재 보고서)','실습')]),
('2일차',[('7교시','AI 브라우저로 코딩 없이 업무 자동화','실습 (설치 포함)'),
 ('8교시','HTML · CSS · JS로 화면 구조 이해','실습'),
 ('9교시','GitHub · Vercel로 웹 배포','실습 (휴대폰 확인)'),
 ('10~11교시','Claude Code로 내 업무 화면 만들기 · 배포','실습 (내 PRD / 공공데이터)'),
 ('12교시','결과 공유 · 업무 적용 계획 · 과정 평가','발표 · 토의')]),
]
def cell(text,col,row,w,h,bf,pp,cp,rs=1):
    return (f'<hp:tc name="" header="0" hasMargin="1" protect="0" editable="0" dirty="0" borderFillIDRef="{bf}">'
     f'<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">'
     f'<hp:p id="2147483648" paraPrIDRef="{pp}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="{cp}"><hp:t>{text}</hp:t></hp:run></hp:p></hp:subList>'
     f'<hp:cellAddr colAddr="{col}" rowAddr="{row}"/><hp:cellSpan colSpan="1" rowSpan="{rs}"/><hp:cellSz width="{w}" height="{h}"/>'
     f'<hp:cellMargin left="139" right="139" top="139" bottom="139"/></hp:tc>')
HH,RH=2400,2300
trs=['<hp:tr>'+''.join(cell(t,i,0,W[i],HH,25 if i==0 else (27 if i==3 else 26),31,32) for i,t in enumerate(['일차','교시','교육 내용','방식']))+'</hp:tr>']
r=1
for day,items in rows:
    for k,(tm,ct,nt) in enumerate(items):
        cs=''
        if k==0: cs+=cell(day,0,r,W[0],RH*len(items),28,32,37,len(items))
        cs+=cell(tm,1,r,W[1],RH,29,33,37)+cell(ct,2,r,W[2],RH,29,33,37)+cell(nt,3,r,W[3],RH,30,33,37)
        trs.append('<hp:tr>'+cs+'</hp:tr>'); r+=1
n=r
tbl=(f'<hp:p id="0" paraPrIDRef="41" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="11">'
 f'<hp:tbl id="1167325999" zOrder="20" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="1" rowCnt="{n}" colCnt="4" cellSpacing="0" borderFillIDRef="5" noAdjust="1">'
 f'<hp:sz width="{sum(W)}" widthRelTo="ABSOLUTE" height="{HH+RH*(n-1)}" heightRelTo="ABSOLUTE" protect="0"/>'
 '<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="0" allowOverlap="0" holdAnchorAndSO="1" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>'
 '<hp:outMargin left="0" right="0" top="0" bottom="0"/><hp:inMargin left="0" right="0" top="0" bottom="0"/>'
 +''.join(trs)+'</hp:tbl></hp:run></hp:p>')
head=('<hp:p id="0" paraPrIDRef="35" styleIDRef="0" pageBreak="1" columnBreak="0" merged="0"><hp:run charPrIDRef="16"><hp:t>붙임  생성형 AI 업무 활용 입문 과정 세부 시간표</hp:t></hp:run></hp:p>'
 '<hp:p id="0" paraPrIDRef="42" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="35"><hp:t> ○ 운영: 2일 연속 총 12시간 (1일 6교시), 교육훈련관 2층 정보화교육장 / 일정 추후 확정</hp:t></hp:run></hp:p>')
note=('<hp:p id="0" paraPrIDRef="42" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="35"><hp:t> ※ 1교시 = 수업 50분 + 휴식 10분. 1일차 저녁 과제(약 30분)와 과정 후 업무 적용 과제 수행, 12교시 과정 평가는 2기 설계에 활용</hp:t></hp:run></hp:p>'
 '<hp:p id="0" paraPrIDRef="42" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="35"><hp:t> ※ 사전 과제: 구글 계정 · ChatGPT 가입, Claude Team 초대 수락 · GitHub 가입 (교육 1주 전 안내)</hp:t></hp:run></hp:p>'
 '<hp:p id="0" paraPrIDRef="42" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="35"><hp:t> ※ 교육자료: https://www.jg-sobang.com/fire-ai/</hp:t></hp:run></hp:p>')
k=s.rfind('</hs:sec>')
s=s[:k]+head+tbl+note+s[k:]
