import routes from '../src/routes';

// Express Router has a stack of layers
const anyRoutes: any = routes as any;
if (!anyRoutes || !anyRoutes.stack) {
  console.log('No router stack found');
  process.exit(0);
}

console.log('Routes stack length:', anyRoutes.stack.length);
for (const layer of anyRoutes.stack) {
  const route = layer.route;
  if (route) {
    console.log('Route:', route.path, Object.keys(route.methods));
  } else if (layer.name === 'router') {
    console.log('Mounted router:', layer.regexp);
    const child = layer.handle;
    if (child && child.stack) {
      console.log('  Child stack length:', child.stack.length);
      for (const childLayer of child.stack) {
        const childRoute = childLayer.route;
        if (childRoute) {
          console.log('  Child route:', childRoute.path, Object.keys(childRoute.methods));
        } else if (childLayer.name === 'router') {
          console.log('  Nested router layer');
        }
      }
    }
  } else {
    console.log('Layer:', layer.name || '<anonymous>');
  }
}
