import { connectDB } from '../config/db';
import { Product } from '../models/Product';

const demoProducts = [
  {
    name: 'Tabaco Virginia Gold',
    description: 'Blend suave con notas dulces para consumo tradicional.',
    category: 'Tabaco',
    price: 12800,
    isFeatured: true,
    stock: 18
  },
  {
    name: 'Tabaco Black Reserve',
    description: 'Perfil intenso y robusto para fumador experimentado.',
    category: 'Tabaco',
    price: 14900,
    isFeatured: false,
    stock: 0
  },
  {
    name: 'Vaper Nova X2',
    description: 'Dispositivo compacto recargable, vapor estable y limpio.',
    category: 'Vapers',
    price: 42500,
    isFeatured: true,
    stock: 12
  },
  {
    name: 'Vaper Pulse Mini',
    description: 'Portátil y discreto, ideal para uso diario.',
    category: 'Vapers',
    price: 36700,
    isFeatured: true,
    stock: 0
  },
  {
    name: 'Picador de aluminio 4 capas',
    description: 'Corte uniforme con acabado premium antideslizante.',
    category: 'Parafernalia',
    price: 9800,
    isFeatured: false,
    stock: 25
  },
  {
    name: 'Papel orgánico King Size',
    description: 'Combustión lenta y sabor neutro, paquete x50.',
    category: 'Parafernalia',
    price: 3200,
    isFeatured: true,
    stock: 40
  }
] as const;

const run = async (): Promise<void> => {
  await connectDB();

  for (const item of demoProducts) {
    await Product.updateOne(
      { name: item.name },
      {
        $set: {
          description: item.description,
          category: item.category,
          price: item.price,
          isFeatured: item.isFeatured,
          stock: item.stock,
          isAvailable: item.stock > 0
        }
      },
      { upsert: true }
    );
  }

  console.log('Datos demo cargados correctamente.');
  process.exit(0);
};

run().catch((error) => {
  console.error('Error cargando datos demo:', error);
  process.exit(1);
});
