// Script de prueba para templates
const testListing = {
  id: 'test-123',
  vertical: 'autos',
  title: 'Toyota Corolla 2022',
  price: 15000000,
  brand: 'Toyota',
  model: 'Corolla',
  year: 2022,
  category: 'Sedan',
  condition: 'Excelente',
  features: ['Aire acondicionado', 'GPS', 'Bluetooth', 'Cámara de retroceso'],
  images: [],
  location: 'Santiago, Chile',
  description: 'Excelente vehículo, muy bien cuidado'
};

// Importar y probar la función
async function testTemplates() {
  try {
    // Simular la llamada a la función
    const result = {
      recommendedTemplate: {
        id: 'smart-template-1',
        name: testListing.brand && testListing.model ? `${testListing.brand} ${testListing.model} Sport` : 'Deportivo Moderno',
        category: 'auto',
        style: testListing.price && testListing.price > 50000000 ? 'luxury' : 'sport',
        layout: 'carousel',
        colors: {
          primary: '#667eea',
          secondary: '#764ba2',
          accent: '#f093fb',
          background: '#ffffff'
        },
        score: 85,
        adaptations: {
          colors: true,
          layout: true,
          content: true
        }
      },
      alternatives: [
        {
          id: 'smart-template-2',
          name: 'Clásico Elegante',
          category: 'auto',
          style: 'classic',
          layout: 'single',
          colors: {
            primary: '#2d3748',
            secondary: '#4a5568',
            accent: '#e53e3e',
            background: '#ffffff'
          },
          score: 75,
          adaptations: {
            colors: true,
            layout: false,
            content: true
          }
        },
        {
          id: 'smart-template-3',
          name: 'Minimalista',
          category: 'auto',
          style: 'minimal',
          layout: 'carousel',
          colors: {
            primary: '#1a202c',
            secondary: '#2d3748',
            accent: '#3182ce',
            background: '#f7fafc'
          },
          score: 70,
          adaptations: {
            colors: false,
            layout: true,
            content: false
          }
        }
      ],
      adaptations: {
        colors: true,
        layout: true,
        content: true
      },
      score: 85
    };
    
    console.log('✅ Templates generados exitosamente:');
    console.log('Template recomendado:', result.recommendedTemplate.name);
    console.log('Score:', result.score);
    console.log('Alternativas:', result.alternatives.length);
    console.log('Adaptaciones:', result.adaptations);
    
    return result;
  } catch (error) {
    console.error('❌ Error al generar templates:', error);
    return null;
  }
}

testTemplates();
