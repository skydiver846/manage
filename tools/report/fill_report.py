"""계획 보고서(hwpx) 채우기. 이 폴더에 원본 양식 src.hwpx를 두고 `python3 fill_report.py` 실행.
양식의 문구를 R 목록 순서대로 바꾸고, annex.py로 붙임 시간표를 붙인 뒤 교직원_AI_공유교육_계획_보고.hwpx를 만든다."""
import os, re, zipfile, shutil
os.chdir(os.path.dirname(os.path.abspath(__file__)))
s=zipfile.ZipFile('src.hwpx').read('Contents/section0.xml').decode('utf-8')
R=[ # (old text, new text) in document order
('- [지역특화교육] 생성형 AI 전문강사 양성 과정 -','- 배운 것을 나누어 함께 키우는 AI 업무 역량 -'),
('교수요원 교육출장 계획 보고','교직원 AI 공유교육 계획 보고'),
('2026.08.14.(금)','2026.10.05.(월)'),
(' 교육훈련의 질적 향상과 디지털 기반 교수역량 강화를 위한 교수요원',' 교수요원 교육출장(생성형 AI 전문강사 양성과정)에서 습득한 내용을'),
(' [지역특화교육] 생성형 AI 전문강사 양성과정 교육출장 계획을 보고함',' 교직원과 공유하기 위한 「생성형 AI 업무 활용 입문」 교육 계획을 보고함'),
(' • 소방공무원 교육훈련규정 제24조 「교수요원의 역량강화 및 평가」',' • 교수요원 교육출장(생성형 AI 전문강사 양성과정, ’26.8.) 후속조치'),
('운영기관','교육대상'),
('참석인원','교육인원'),
('생성형 AI ','생성형 AI '),
('전문강사 양성','업무 활용'),
('과정','입문 과정'),
('국립순천대학교 지능기술연구소','교직원 (생성형 AI 입문자)'),
('’26. 8. 19.(수)∼ 8. 28.(금)','추후 확정'),
('총 60시간(8일)','총 12시간 (2일 연속, 1일 6시간)'),
('국립순천대학교','교육훈련관 2층 정보화교육장'),
('1명','20명 내외'),
('(소방위 조영진)','(강사: 소방위 조영진)'),
('생성형 AI 전문강사 양성을 목표로 하는 실습 중심 교육임.','실제 행정업무(강의평가 결과보고)를 AI로 처리해 보는 실습 중심 교육임.'),
(' 4대 LLM(ChatGPT, Claude, Gemini, Grok) 비교 · 활용 및 ',' 1일차: 프롬프트 · 파일 활용, 옵시디언(MD) 기초, '),
('AI 콘텐츠 제작','업무 기획서(PRD) 작성'),
('업무 자동화 체계 이해 및 바이브코딩 기반 ','1일차: 스킬 만들기(내 업무 스킬 · 조직 배포), '),
('웹앱 기획 · 구현 · 배포','PRD 기반 보고자료 생성'),
('AI 기반 교수설계 및 강의 시연 발표 등','2일차: AI 브라우저 자동화, 웹 배포, Claude Code로 내 업무 화면 만들기'),
(' 출장 필요성',' 추진 배경'),
(' 소방교육은 단순 지식 전달을 넘어, ',' 생성형 AI는 문서 작성 보조를 넘어, '),
('교육생의 현장 대응력 · 판단력 · 상황대처   능력 을 향상시키는 방향으로 운영될 필요가 있음.','안내문 · 결과보고서 · 집계 도구 제작 등 반복되는 행정업무를 자동화하는 수준으로 발전하고 있음.'),
(' 생성형 AI는 강의자료 작성 보조를 넘어, ',' 단순 질의응답 활용에 그치면 효과가 제한적이므로, '),
('사례 기반 토의문항, 상황대응형 시나  리오, 참여형 수업자료 등을 설계하는 데 활용 가능성이 높음.','업무 양식을 고정하는 스킬, 기획서(PRD) 기반 결과물 제작 등 실무 적용 중심의 교육이 필요함.'),
(' 본 과정은 공고문상 기대효과로 실무형 ',' 교수요원 교육출장(생성형 AI 전문강사 양성과정)에서 '),
('AI 강사 양성, AI기반 교수설계 및 교안  작성 능력을 통한 즉시 현장 투입 가능, 강사 자원 내재화를 제시','습득한 활용 방법과 실습자료를 교직원과 공유'),
('하고 있어,   ','하여, '),
('교육담당자의 직무와 직접 관련성이 높음.','부서별 업무에 생성형 AI 활용이 확산되도록 하고자 함.'),
('  위 교육 참석이 ','  원활한 실습을 위해 '),
('직무와 직접 관련된 공무상 출장에 해당함을 감안','Claude Team 유료 계정 구독(교육 기간 1개월)'),
('하여, ','과 '),
('관련 규정에 따라 출장여비가 지급될 수 있도록 교육지원과(경리팀) 협조 요청','강의장 PC 사전 점검(사이트 접속 · 옵시디언 · Aside 설치 허용)에 대해 교육지원과(경리팀) 및 전산 담당 협조 요청'),
(' ※ 소요예산: 숙박(6일), 식비, 일비, 교통비(왕복 2회)',' ※ 소요예산: Claude Team 이용료 1인 월 $25 × 20명 = 약 $500(부가세 별도), 그 외 서비스는 무료 요금제 활용'),
]
pos=0
for old,new in R:
    tag='<hp:t>'+old+'</hp:t>'
    i=s.find(tag,pos)
    assert i>=0,(old)
    s=s[:i]+'<hp:t>'+new+'</hp:t>'+s[i+len(tag):]
    pos=i+len(new)
exec(open('annex.py',encoding='utf-8').read())
s=re.sub(r'<hp:linesegarray>.*?</hp:linesegarray>','',s,flags=re.S)
import xml.dom.minidom; xml.dom.minidom.parseString(s.encode())
# preview text
t=re.sub(r'<[^>]+>',' ',s); 
out='교직원_AI_공유교육_계획_보고.hwpx'
zin=zipfile.ZipFile('src.hwpx')
zo=zipfile.ZipFile(out,'w')
for it in zin.infolist():
    data=zin.read(it.filename)
    if it.filename=='Contents/section0.xml': data=s.encode('utf-8')
    if it.filename=='Preview/PrvText.txt': data=re.sub(r'\s+',' ',t).strip()[:1000].encode('utf-8')
    zo.writestr(it, data, compress_type=zipfile.ZIP_STORED if it.filename=='mimetype' else zipfile.ZIP_DEFLATED)
zo.close()
print('ok')
