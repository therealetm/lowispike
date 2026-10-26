# iOS status bar (time, signal, wifi, battery) as inline SVG/HTML, in CSS points
def statusbar(color='#000', time='9:41', width=393, island=True):
    c = color
    sig = ''.join(f'<rect x="{i*6}" y="{12-(i+1)*3}" width="4" height="{(i+1)*3}" rx="1" fill="{c}"/>' for i in range(4))
    wifi = (f'<svg width="17" height="12" viewBox="0 0 17 12"><path d="M8.5 2.3c2.4 0 4.6.9 6.3 2.5l1.2-1.2C13.9 1.6 11.3.5 8.5.5S3.1 1.6 1 3.6l1.2 1.2C3.9 3.2 6.1 2.3 8.5 2.3z" fill="{c}"/>'
            f'<path d="M8.5 5.6c1.5 0 2.9.6 3.9 1.5l1.2-1.2C12.3 4.6 10.5 3.8 8.5 3.8s-3.8.8-5.1 2.1l1.2 1.2c1-.9 2.4-1.5 3.9-1.5z" fill="{c}"/>'
            f'<path d="M8.5 8.9c.7 0 1.3.3 1.7.7L8.5 11.4 6.8 9.6c.4-.4 1-.7 1.7-.7z" fill="{c}"/></svg>')
    batt = (f'<svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.8" fill="none" stroke="{c}" stroke-opacity=".4"/>'
            f'<rect x="2" y="2" width="17" height="9" rx="2.4" fill="{c}"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="{c}" fill-opacity=".45"/></svg>')
    isl = '<div style="position:absolute;left:50%;top:11px;width:125px;height:37px;margin-left:-62.5px;border-radius:19px;background:#000"></div>' if island else ''
    return (f'<div class="sb" style="position:absolute;left:0;top:0;width:{width}px;height:54px;z-index:50">{isl}'
            f'<div style="position:absolute;left:0;width:{width*0.39:.0f}px;top:17px;text-align:center;font:600 17px/22px Inter;letter-spacing:-.4px;color:{c}">{time}</div>'
            f'<div style="position:absolute;right:{width*0.075:.0f}px;top:21px;display:flex;gap:6px;align-items:center">'
            f'<svg width="22" height="12">{sig}</svg>{wifi}{batt}</div></div>')
