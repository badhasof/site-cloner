/**
 * Example usage of the site-cloner generator module
 */

import {
  generateProject,
  validateOutputDirectory,
  isDirectoryEmpty,
} from './index.js';
import {
  DetectedComponent,
  ProcessedStyles,
  AnimationResult,
  Asset,
} from '../types/index.js';

async function exampleUsage() {
  // Example 1: Simple landing page
  const outputDir = './generated/landing-page';

  // Validate output directory
  try {
    await validateOutputDirectory(outputDir);
  } catch (error) {
    console.error('Output directory validation failed:', error);
    return;
  }

  // Define components
  const components: DetectedComponent[] = [
    {
      name: 'Hero',
      type: 'function',
      code: `function Hero() {
  return (
    <section className="hero">
      <h1 className="hero-title">Welcome to Our Site</h1>
      <p className="hero-subtitle">Building amazing experiences</p>
      <button className="cta-button">Get Started</button>
    </section>
  );
}

export default Hero;`,
      dependencies: ['react'],
      hooks: [],
      isExported: true,
      moduleId: 0,
    },
    {
      name: 'Features',
      type: 'function',
      code: `import { useState } from 'react';

function Features() {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    { title: 'Fast', description: 'Lightning fast performance' },
    { title: 'Secure', description: 'Bank-level security' },
    { title: 'Scalable', description: 'Grows with your needs' },
  ];

  return (
    <section className="features">
      <h2>Features</h2>
      <div className="feature-grid">
        {features.map((feature, index) => (
          <div
            key={index}
            className="feature-card"
            onClick={() => setActiveFeature(index)}
          >
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Features;`,
      dependencies: ['react'],
      hooks: [{ name: 'useState', type: 'state' }],
      isExported: true,
      moduleId: 1,
    },
    {
      name: 'Footer',
      type: 'function',
      code: `function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p>&copy; 2024 My Company. All rights reserved.</p>
        <nav>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
          <a href="/privacy">Privacy</a>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;`,
      dependencies: ['react'],
      hooks: [],
      isExported: true,
      moduleId: 2,
    },
  ];

  // Define styles
  const styles: ProcessedStyles = {
    classMap: new Map([
      ['.hero', [
        'min-h-screen',
        'flex',
        'flex-col',
        'items-center',
        'justify-center',
        'bg-gradient-to-br',
        'from-blue-500',
        'to-purple-600',
        'text-white',
        'px-4',
      ]],
      ['.hero-title', ['text-5xl', 'font-bold', 'mb-4']],
      ['.hero-subtitle', ['text-xl', 'mb-8', 'text-gray-100']],
      ['.cta-button', [
        'bg-white',
        'text-blue-600',
        'px-8',
        'py-3',
        'rounded-lg',
        'font-semibold',
        'hover:bg-gray-100',
        'transition-colors',
      ]],
      ['.features', ['py-20', 'px-4', 'max-w-6xl', 'mx-auto']],
      ['.feature-grid', ['grid', 'grid-cols-1', 'md:grid-cols-3', 'gap-8']],
      ['.feature-card', [
        'bg-white',
        'p-6',
        'rounded-lg',
        'shadow-lg',
        'hover:shadow-xl',
        'transition-shadow',
        'cursor-pointer',
      ]],
      ['.footer', ['bg-gray-900', 'text-white', 'py-8']],
      ['.footer-content', [
        'max-w-6xl',
        'mx-auto',
        'px-4',
        'flex',
        'justify-between',
        'items-center',
      ]],
    ]),
    tailwindClasses: [],
    customCSS: `
/* Custom animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 0.6s ease-out;
}
`,
    cssVariables: {},
    mappings: [],
    config: {
      theme: {
        extend: {
          colors: {
            primary: '#3b82f6',
            secondary: '#8b5cf6',
            accent: '#ec4899',
          },
        },
      },
    },
    animations: [],
  };

  // Define animations
  const animations: AnimationResult = {
    animations: [
      {
        id: 'fadeIn-hero',
        type: 'fadeIn',
        selector: '.hero',
        keyframes: [
          { offset: 0, properties: { opacity: 0, y: 20 } },
          { offset: 1, properties: { opacity: 1, y: 0 } },
        ],
        timing: {
          duration: 600,
          delay: 0,
          iterations: 1,
          direction: 'normal',
          easing: 'ease-out',
          fillMode: 'forwards',
        },
      },
      {
        id: 'stagger-feature-card',
        type: 'stagger',
        selector: '.feature-card',
        keyframes: [
          { offset: 0, properties: { opacity: 0, y: 20 } },
          { offset: 1, properties: { opacity: 1, y: 0 } },
        ],
        timing: {
          duration: 400,
          delay: 0,
          iterations: 1,
          direction: 'normal',
          easing: 'ease-out',
          fillMode: 'forwards',
        },
      },
    ],
    framerMotionCode: '',
    cssAnimations: [],
    scrollAnimations: [],
  };

  // Define assets
  const assets: Asset[] = [
    {
      type: 'image',
      url: 'https://via.placeholder.com/800x600',
      localPath: 'images/hero-bg.png',
      dimensions: { width: 800, height: 600 },
    },
    {
      type: 'icon',
      url: 'https://cdn.example.com/logo.svg',
      localPath: 'images/logo.svg',
    },
  ];

  // Generate the project
  console.log('Generating project...');
  await generateProject({
    outputDir,
    components,
    styles,
    animations,
    assets,
    html: '<html></html>',
  });

  console.log('\nProject generated successfully!');
  console.log('\nNext steps:');
  console.log(`  cd ${outputDir}`);
  console.log('  npm install');
  console.log('  npm run dev');
}

// Example 2: E-commerce product page
async function exampleEcommerce() {
  const outputDir = './generated/ecommerce';

  const components: DetectedComponent[] = [
    {
      name: 'ProductGallery',
      type: 'function',
      code: `import { useState } from 'react';

function ProductGallery({ images }: { images: string[] }) {
  const [activeImage, setActiveImage] = useState(0);

  return (
    <div className="product-gallery">
      <div className="main-image">
        <img src={images[activeImage]} alt="Product" />
      </div>
      <div className="thumbnail-grid">
        {images.map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={\`Thumbnail \${idx + 1}\`}
            onClick={() => setActiveImage(idx)}
            className={activeImage === idx ? 'active' : ''}
          />
        ))}
      </div>
    </div>
  );
}

export default ProductGallery;`,
      dependencies: ['react'],
      hooks: [{ name: 'useState', type: 'state' }],
      isExported: true,
      moduleId: 0,
    },
    {
      name: 'AddToCart',
      type: 'function',
      code: `import { useState } from 'react';

function AddToCart({ productId }: { productId: string }) {
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = () => {
    // Add to cart logic
    console.log('Adding', quantity, 'items to cart');
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="add-to-cart">
      <div className="quantity-selector">
        <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>
          -
        </button>
        <span>{quantity}</span>
        <button onClick={() => setQuantity(quantity + 1)}>+</button>
      </div>
      <button
        className={isAdded ? 'added' : 'add-button'}
        onClick={handleAddToCart}
      >
        {isAdded ? 'Added!' : 'Add to Cart'}
      </button>
    </div>
  );
}

export default AddToCart;`,
      dependencies: ['react'],
      hooks: [{ name: 'useState', type: 'state' }],
      isExported: true,
      moduleId: 1,
    },
  ];

  const styles: ProcessedStyles = {
    classMap: new Map([
      ['.product-gallery', ['w-full', 'max-w-2xl']],
      ['.main-image', ['w-full', 'aspect-square', 'mb-4', 'rounded-lg', 'overflow-hidden']],
      ['.thumbnail-grid', ['grid', 'grid-cols-4', 'gap-2']],
      ['.add-to-cart', ['flex', 'gap-4', 'items-center']],
      ['.quantity-selector', ['flex', 'border', 'rounded-lg', 'overflow-hidden']],
      ['.add-button', [
        'bg-blue-600',
        'text-white',
        'px-8',
        'py-3',
        'rounded-lg',
        'hover:bg-blue-700',
        'transition-colors',
      ]],
    ]),
    tailwindClasses: [],
    customCSS: '',
    cssVariables: {},
    mappings: [],
    config: {},
    animations: [],
  };

  const animations: AnimationResult = {
    animations: [],
    framerMotionCode: '',
    cssAnimations: [],
    scrollAnimations: [],
  };

  const assets: Asset[] = [];

  await generateProject({
    outputDir,
    components,
    styles,
    animations,
    assets,
    html: '<html></html>',
  });
  console.log('E-commerce project generated!');
}

// Example 3: Blog layout with routing
async function exampleBlog() {
  const outputDir = './generated/blog';

  const components: DetectedComponent[] = [
    {
      name: 'BlogPost',
      type: 'function',
      code: `import { useParams } from 'react-router-dom';

function BlogPost() {
  const { id } = useParams();

  return (
    <article className="blog-post">
      <h1>Blog Post {id}</h1>
      <div className="post-content">
        <p>Post content goes here...</p>
      </div>
    </article>
  );
}

export default BlogPost;`,
      dependencies: ['react', 'react-router-dom'],
      hooks: [],
      isExported: true,
      moduleId: 0,
    },
  ];

  const styles: ProcessedStyles = {
    classMap: new Map([
      ['.blog-post', ['max-w-4xl', 'mx-auto', 'px-4', 'py-8']],
      ['.post-content', ['prose', 'prose-lg']],
    ]),
    tailwindClasses: [],
    customCSS: '',
    cssVariables: {},
    mappings: [],
    config: {},
    animations: [],
  };

  const animations: AnimationResult = {
    animations: [],
    framerMotionCode: '',
    cssAnimations: [],
    scrollAnimations: [],
  };

  await generateProject({
    outputDir,
    components,
    styles,
    animations,
    assets: [],
    html: '<html></html>',
  });
  console.log('Blog project generated!');
}

// Run examples
if (require.main === module) {
  exampleUsage()
    .then(() => console.log('\nAll examples completed!'))
    .catch((error) => console.error('Error:', error));
}

export { exampleUsage, exampleEcommerce, exampleBlog };
