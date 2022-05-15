import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { PlaymapComponent } from './playmap/playmap.component';
import { SvgDraggableDirective } from './svg-draggable.directive';
import { SvgZoomableDirective } from './svg-zoomable.directive';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent,
    PlaymapComponent,
    SvgDraggableDirective,
    SvgZoomableDirective
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
