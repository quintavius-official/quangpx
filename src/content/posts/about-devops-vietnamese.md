---
title: "About DevOps (Vietnamese)"
pubDatetime: 2026-08-26T00:00:00Z
description: ""
tags:
  - DevOps
  - CI/CD
  - Automation
  - AGI
  - Agentic AI
featured: true
draft: false
---


Hôm nay tôi sẽ nói về 1 cái term không mới, rất quen thuộc với dân Dev cũng như Architect, thậm chí nhiều lúc được cho là tầm thường trong giới công nghệ, tuy nhiên chính nó là 1 term khó bị outdated và thay thế nhất: DevOps.

## All about the (boring) Loops

Vậy DevOps là gì? Như tiêu đề, all about the (very boring) loops! Chắc tới đây các bạn sẽ nghĩ tới ngay các buzzword mới nổi như cồn hiện nay, Agent Loops, Loops Engineering, 1-cái-tên-mới-chế loops khác, etc... cái thứ mà khi cắm vào các con AI agent nó sẽ biến agent của các bạn thành 1 con super-intelligence, hoặc 2, cỗ máy đốt token...

Nói vui vậy thôi muốn biết rõ DevOps cần quay ngược nhiều năm trước khi mà hoạt động phần mềm cái thời ăn lông ở lỗ vẫn chưa biết GenAI là gì (tôi chưa tưởng tượng được tôi có dám quay ngược lại về thời ấy hay ko!).

Khi 1 bạn SE (hoặc ở cty tôi gọi gọn là Dev), tạo ra 1 sản phẩm, một phần mềm, hay chỉ đơn giản là 1 phần nhỏ trong source code có nhu cầu muốn deploy cái thành phẩm từ máy local của bạn dev, tới cái máy đích là test, xa hơn là staging và rồi prod.

Trước khi được phép deploy, bạn phải qua hàng đống quy trình phức tạp, ví dụ đếm xem có thiếu cái dấu phẩy hay space nào ko.. (đùa thôi!), đảm bảo nào là naming convention, coding smell, design pattern, đủ thể loại DRY, KISS, pattern-hay-quy-trình-tự-chế-trong-cty, ... rồi deploy xong phải đảm bảo test cases integration test đầy đủ, security scan, vân vân và mây mây... trước khi mới reach được tới Prod.

Mà rồi prod cũng chưa phải hồi kết, muốn 1 thành phẩm tới được tay người dùng, phải xem chức năng đó có dính dáng tới data migration không, có back test backfilling rồi backward compatible không, đó là sản phẩm nội bộ, còn end-user product?

Release với user nào, ở đâu, version nào, có canary không hay chỉ rollout, đánh giá impact hoặc performance sau deploy để team growth bu vào lấy dữ liệu, đo funnel,.... để tạo thành 1 vòng phản hồi feedback rồi sau đó tạo plan rồi requirement và bạn dev tiếp tục quy trình như cũ và phần mềm cứ thế liên tục cải thiện theo thời gian.

Tất cả những thứ tôi nói ở trên, đều là quy trình, đều là workflow và ở bất kỳ nơi phát triển phần mềm lớn-nhỏ nào đều phải trải qua, có thể thêm-bớt 1 số gate nhất định, nhưng nhìn chung theo như tôi gọi vui, đó là 1 vòng lặp quy trình nhàm chán (very boring loops) hay còn có cái tên mỹ miều hơn - CI/CD.

Mà thật chất khi mới ra đời, cái nhu cầu ấy chỉ vỏn vẹn là deploy lên 1 môi trường để cho người dùng sử dụng mà thôi, nhưng qua thời gian, cùng với nhiều công nghệ phát triển, quá nhiều toolsets và có rất nhiều thứ để 1 dev có thể tích hợp vào quy trình CI/CD của mình, dẫn đến nhu cầu ngày càng lớn về operations.

> Cái tên DevOps thì cũng không phải tự dưng mà có: từ 2007 anh Patrick Debois đã ngán ngẩm với friction giữa Dev và Ops trong 1 dự án migrate data center, tới Agile 2008 thì gặp được 1 người đồng cảnh ngộ là Andrew Shafer trong 1 buổi họp chỉ vỏn vẹn 2 người tham dự (tính luôn cả 2 ổng!), rồi tới 2009 xem xong cái talk huyền thoại "10+ Deploys per Day" của Flickr là quyết định tổ chức hẳn 1 conference tên DevOpsDays để đặt tên chính thức cho cái thứ cả 2 đã ấp ủ bấy lâu. Và nhu cầu về DevOps Engineer vì thế cũng bắt đầu hình thành.

Và rồi, việc gì tới cũng tới, nhiều cái terms con cháu được đẻ ra để ăn theo: GitOps, SecOps, AiOps, DevSecOps, DevSecAIOps, DevSecAIAgentOps, tên-dài-lắm-ops, (tôi chắc chắn thiên hạ sẽ có ai đó nghĩ ra LoopsOps mặc dù nghe nó hơi ngây thơ nhưng tôi chắc chắn là sẽ có thanh niên nào đó nghĩ ra term này...) ....

Nhưng rồi cuối cùng tất cả đều quy về 1 mối, thật ra tất cả những term con cháu đó chỉ là nước trong bình chứa nước lớn là DevOps, chỉ có điều bạn đựng vào cái bình là gì, thì nó tuỳ thuộc vào team, công ty và business của phần mềm của bạn đang build...

## From automation to autonomous and AGI

Và nhiều người cũng sẽ nhận ra và tự hỏi "Tôi thấy mấy cái workflow hay CI/CD này nó giống automation hơn, sao không gọi là automation, mà gọi là DevOps?".

Automation đúng nhưng chưa đủ, quay trở lại hình tượng cái bình, automation chính là chất lượng cái thứ nước bạn đặt bên trong.

Rượu ngon? Bia thơm? Bất cứ thứ gì miễn là nó chất lượng.

Nhưng không phải cái thứ gì gọi là nước mà đựng trong bình thì có thể được xem là bình rượu, automation cũng vậy, không phải automation nào cũng gọi là DevOps. Nó bắt buộc phải tạo thành 1 vòng lặp phản hồi feedback mà tôi đã đề cập bên trên.

Và cần nhắc lại cái gọi là loops hay loops engineering mà cư dân mạng đang gọi, thật chất cũng chỉ là 1 món rượu whisky thượng hạng ngâm trong vài thập kỷ (thời gian mà nó được training bởi data) đựng trong 1 cái bình thẩm mỹ cao có khắc vài dòng chữ mỹ miều: "Powered by <tên công ty AI nghìn tỷ nào đó>"...

Chính xác là như vậy! Nhưng để đu theo trend mỹ miều này, chúng ta cũng không thể gọi cái thứ nước chất lượng đầu ra đó là automation được, phải là thứ gì đó cao cấp hơn: nó phải là Autonomous, phải là AGI, phải là Điểm kỳ dị, phải là Superintelligence, Matrix, Skynet, etc... Bạn hiểu ý tôi rồi chứ?

Nhưng cũng phải phân tích một cách nghiêm túc, nếu chúng ta thực sự đạt được level này thì sẽ như thế nào và mọi thứ sẽ trông ra sao? Không một ai biết cả, kể cả người "phát hiện" ra nó.

Elon Musk, tỷ phú giàu nhất thế giới hiện tại và cũng cực kỳ thông minh, mới đây trả lời phỏng vấn The Economist (7/2026) đã dự đoán rằng tới năm 2036 tiền sẽ chẳng còn ý nghĩa gì nữa, vì AI và robot sẽ tạo ra dư thừa vật chất tới mức chẳng ai cần tiền để có đủ ăn đủ mặc nữa. Liệu rằng bạn có tin không?

## The final target

Tôi sẽ không nói thêm về câu chuyện AGI nữa vì nó hơi lan man so với chủ đề chính nhưng nhìn chung khi bạn đã đọc tới đây, dù tôi không phân tích gì về mặt kỹ thuật của DevOps (hoặc ít nhất là tôi không nhắc sâu về nó vì chủ đề có vẻ nhàm chán trong thời đại này...), nhưng tôi nghĩ bạn cũng hình dung về DevOps là gì và vai trò quan trọng của nó trong phát triển phần mềm truyền thống hay phát triển agent hiện nay được hiện diện với cái tên khác là loops.

Và nhìn chung, dù gọi là loops hay DevOps, chúng cũng chỉ có chung 1 mục đích và mục tiêu duy nhất - tăng tốc độ, chất lượng, bảo mật, ... (bất cứ thứ gì bạn muốn đặt đằng trước chữ Ops) và biến nó thành 1 vòng lặp feedback loop hoàn hảo (chữ Ops), 1 vòng lặp tự cải thiện của phần mềm, của agent, của bất cứ thứ gì mà bạn muốn develop (chữ Dev).


## The future

Liệu loop có tự cải thiện chính nó không? Liệu có 1 vòng lặp tự cải thiện không?

Khả thi nhưng tính stable và safety là 2 thứ mà theo tôi là cực kỳ quan trọng trong mô hình self-evolution, đó là lý do vì sao harness engineering là 1 thứ không thể thiếu bên cạnh agentic hay loops engineering, cũng giống như security và safety trong DevOps vậy.

Tôi sẽ nói vấn đề này vào những kỳ sau, và sẽ tập trung hơn vào những từ kỹ thuật bớt nhàm chán hơn (tôi cho rằng agentic hay harness thì nghe có vẻ bớt nhàm chán hơn DevOps hay Safety và Compliance, dù về bản chất chúng như nhau).

> Vậy theo bạn, tương lai nào đang chờ software engineering khi DevOps phát triển tới level Autonomous?
>
> Kỳ sau chúng ta sẽ bóc tách sâu hơn về harness engineering, và tính ổn định (stable) cùng an toàn (safety) mà bất kỳ mô hình self-evolution nào cũng cần có trước khi dám tự nhận mình "trưởng thành".