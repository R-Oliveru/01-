import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { Idea, Project, Product, GrowthTemplate } from '../types';

interface ZeroPlanDB extends DBSchema {
  ideas: { key: string; value: Idea; indexes: { 'by-category': string; 'by-created': string } };
  projects: { key: string; value: Project; indexes: { 'by-status': string } };
  products: { key: string; value: Product; indexes: { 'by-status': string } };
  growthTemplates: { key: string; value: GrowthTemplate };
}

const DB_NAME = '01plan-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ZeroPlanDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ZeroPlanDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Ideas store
        const ideaStore = db.createObjectStore('ideas', { keyPath: 'id' });
        ideaStore.createIndex('by-category', 'category', { unique: false });
        ideaStore.createIndex('by-created', 'createdAt', { unique: false });

        // Projects store
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
        projectStore.createIndex('by-status', 'status', { unique: false });

        // Products store
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('by-status', 'status', { unique: false });

        // GrowthTemplates store
        db.createObjectStore('growthTemplates', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

// ============ Ideas CRUD ============
export async function getAllIdeas(): Promise<Idea[]> {
  const db = await getDB();
  return db.getAll('ideas');
}
export async function addIdea(idea: Idea): Promise<void> {
  const db = await getDB();
  await db.put('ideas', idea);
}
export async function updateIdea(idea: Idea): Promise<void> {
  const db = await getDB();
  await db.put('ideas', idea);
}
export async function deleteIdea(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('ideas', id);
}

// ============ Projects CRUD ============
export async function getAllProjects(): Promise<Project[]> {
  const db = await getDB();
  return db.getAll('projects');
}
export async function addProject(project: Project): Promise<void> {
  const db = await getDB();
  await db.put('projects', project);
}
export async function updateProject(project: Project): Promise<void> {
  const db = await getDB();
  await db.put('projects', project);
}
export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('projects', id);
}

// ============ Products CRUD ============
export async function getAllProducts(): Promise<Product[]> {
  const db = await getDB();
  return db.getAll('products');
}
export async function addProduct(product: Product): Promise<void> {
  const db = await getDB();
  await db.put('products', product);
}
export async function updateProduct(product: Product): Promise<void> {
  const db = await getDB();
  await db.put('products', product);
}
export async function deleteProduct(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('products', id);
}

// ============ GrowthTemplates CRUD ============
export async function getAllGrowthTemplates(): Promise<GrowthTemplate[]> {
  const db = await getDB();
  return db.getAll('growthTemplates');
}
export async function putGrowthTemplate(tmpl: GrowthTemplate): Promise<void> {
  const db = await getDB();
  await db.put('growthTemplates', tmpl);
}
export async function deleteGrowthTemplate(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('growthTemplates', id);
}
