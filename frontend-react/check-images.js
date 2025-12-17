// Скрипт для проверки наличия preview у всех работ
const mockWorks = [
  { id: 1, title: 'Курсовая работа по экономике', preview: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop' },
  { id: 2, title: 'Реферат по истории России', preview: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=400&h=300&fit=crop' },
  { id: 3, title: 'Лабораторная работа по физике', preview: 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400&h=300&fit=crop' },
  { id: 4, title: 'Дипломная работа по программированию', preview: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=300&fit=crop' },
  { id: 5, title: 'Контрольная работа по математике', preview: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=300&fit=crop' },
  { id: 6, title: 'Эссе по литературе', preview: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop' },
  { id: 7, title: 'Отчет по практике', preview: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop' },
  { id: 8, title: 'Курсовая работа по химии', preview: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&h=300&fit=crop' },
  { id: 9, title: 'Реферат по биологии', preview: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=400&h=300&fit=crop' },
  { id: 10, title: 'Дипломная работа по экономике', preview: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop' },
  { id: 11, title: 'Контрольная работа по физике', preview: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=300&fit=crop' },
  { id: 12, title: 'Курсовая работа по психологии', preview: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop' },
];

console.log('✅ Проверка наличия preview у всех работ:\n');

mockWorks.forEach(work => {
  const hasPreview = work.preview && work.preview.length > 0;
  const status = hasPreview ? '✅' : '❌';
  console.log(`${status} ID ${work.id}: ${work.title}`);
  if (hasPreview) {
    console.log(`   URL: ${work.preview}\n`);
  }
});

const withoutPreview = mockWorks.filter(w => !w.preview || w.preview.length === 0);
if (withoutPreview.length === 0) {
  console.log('\n🎉 Все работы имеют preview изображения!');
} else {
  console.log(`\n⚠️ ${withoutPreview.length} работ без preview`);
}
