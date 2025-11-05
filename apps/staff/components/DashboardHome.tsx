import React from 'react';
import { MOCK_APPOINTMENTS, MOCK_CALL_LOGS, MOCK_CALL_UPDATES, ACTIVITY_COLORS } from '../constants';
import { TimetableEntry, Meeting } from '../types';

const Card: React.FC<{ children: React.ReactNode; className?: string; title: string; icon: string }> = ({ children, className, title, icon }) => (
    <div className={`bg-slate-900/50 backdrop-blur-lg rounded-2xl border border-white/10 p-6 text-white ${className}`}>
        <div className="flex items-center space-x-3 mb-4">
            <i className={`${icon} text-xl text-purple-400`}></i>
            <h2 className="text-xl font-bold">{title}</h2>
        </div>
        {children}
    </div>
);

const TimetableCard: React.FC<{ timetable: TimetableEntry[] }> = ({ timetable }) => {
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    const times = ['08:30-09:30', '09:30-10:30', '10:30-11:30', '11:30-12:30'];

    const findEntry = (day: string, time: string): TimetableEntry | undefined => {
        const [start] = time.split('-');
        return timetable.find(entry => entry.day.substring(0,3).toUpperCase() === day && entry.timeSlot.start === start.substring(0,5));
    };

    if (timetable.length === 0) {
        return (
             <Card title="Weekly Timetable" icon="fa-solid fa-calendar-week" className="md:col-span-2">
                <div className="flex items-center justify-center h-full text-slate-400 min-h-[200px]">
                    <p>No timetable set. Go to the Timetable page to add entries.</p>
                </div>
            </Card>
        )
    }

    return (
        <Card title="Weekly Timetable" icon="fa-solid fa-calendar-week" className="md:col-span-2">
            <div className="grid grid-cols-6 gap-2 text-center text-sm">
                <div className="text-slate-400">TIME</div>
                {days.map(day => <div key={day} className="text-slate-400 font-semibold">{day}</div>)}
                
                {times.map(time => (
                    <React.Fragment key={time}>
                        <div className="text-slate-400 self-center text-xs">{time.split('-')[0]}</div>
                        {days.map(day => {
                            const entry = findEntry(day, time);
                            return (
                                <div key={`${day}-${time}`} className="h-12 flex items-center justify-center p-1">
                                    {entry && entry.activity !== 'Free' && (
                                        <div className={`w-full text-xs font-semibold rounded-md p-2 ${ACTIVITY_COLORS[entry.activity]}`}>
                                            {entry.activity}
                                            {entry.subject && <span className="block opacity-75 text-xxs truncate">{entry.subject}</span>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        </Card>
    );
};

const CallUpdatesCard: React.FC = () => (
    <Card title="Call Updates" icon="fa-solid fa-phone-volume">
        {MOCK_CALL_UPDATES.length === 0 ? (
            <p className="text-slate-400">No recent calls.</p>
        ) : (
            <div>...</div>
        )}
    </Card>
);

const MeetingsCard: React.FC<{ meetings: Meeting[] }> = ({ meetings }) => (
    <Card title="Upcoming Meetings" icon="fa-solid fa-users-viewfinder">
        {meetings.length === 0 ? (
            <p className="text-slate-400">No upcoming meetings.</p>
        ) : (
            <div className="space-y-3">
                {meetings.map(meeting => (
                    <div key={meeting.id} className="bg-slate-800/50 p-3 rounded-lg">
                        <p className="font-semibold">{meeting.title}</p>
                        <p className="text-sm text-slate-400 flex items-center space-x-2 mt-1">
                            <i className="fa-regular fa-calendar-alt"></i>
                            <span>{new Date(meeting.date).toLocaleDateString()} at {meeting.time}</span>
                        </p>
                         <p className="text-sm text-slate-400 flex items-center space-x-2 mt-1">
                            <i className="fa-solid fa-location-dot"></i>
                            <span>{meeting.location}</span>
                        </p>
                    </div>
                ))}
            </div>
        )}
    </Card>
);


const AppointmentsCard: React.FC = () => (
    <Card title="Appointments" icon="fa-solid fa-handshake">
         <div className="space-y-3">
            {MOCK_APPOINTMENTS.map(apt => (
                <div key={apt.id} className="bg-slate-800/50 p-3 rounded-lg flex justify-between items-center">
                    <div>
                        <p className="font-semibold">{apt.clientName}</p>
                        <p className="text-sm text-slate-400 flex items-center space-x-2">
                            <i className="fa-regular fa-clock"></i>
                            <span>{apt.date}, {apt.time}</span>
                        </p>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full ${apt.status === 'Confirmed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {apt.status}
                    </span>
                </div>
            ))}
        </div>
    </Card>
);

interface DashboardHomeProps {
    timetable: TimetableEntry[];
    meetings: Meeting[];
}

const DashboardHome: React.FC<DashboardHomeProps> = ({ timetable, meetings }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
            <TimetableCard timetable={timetable} />
            <CallUpdatesCard />
            <MeetingsCard meetings={meetings} />
            <AppointmentsCard />
        </div>
    );
};

export default DashboardHome;